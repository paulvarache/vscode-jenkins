import { JenkinsApi } from './api';

export enum TreeViewItemType {
    Unknown,
    Root,
    Org,
    Job,
    MultiBranch,
    Branch,
    Node,
    Build,
    JenkinsRoot,
    Project,
    ComputerSet,
    MasterNode,
    SlaveNode,
}

export enum TreeViewItemState {
    Unknown,
    Building,
    Success,
    Failure,
}

export class JenkinsTreeViewItem {
    public url : string;
    public label : string;
    public type : TreeViewItemType;
    public children : JenkinsTreeViewItem[] = [];
    public parent : JenkinsTreeViewItem|null = null;
    public populated : boolean = false;
    public state : TreeViewItemState = TreeViewItemState.Unknown;
    constructor(url : string, label : string, type : TreeViewItemType) {
        this.url = url;
        this.type = type;
        this.label = label;
    }
    setChildren(children : JenkinsTreeViewItem[]) {
        children.forEach(c => c.setParent(this));
        this.children = children;
    }
    setParent(parent : JenkinsTreeViewItem) {
        this.parent = parent;
    }
    getContextValue() {
        switch (this.type) {
            case TreeViewItemType.Build: {
                return 'build';
            }
            default: {
                return 'job';
            }
        }
    }
    static getStateSuffix(state : TreeViewItemState) : string {
        switch (state) {
            case TreeViewItemState.Unknown: {
                return 'unknown';
            }
            case TreeViewItemState.Building: {
                return 'building';
            }
            case TreeViewItemState.Success: {
                return 'success';
            }
            case TreeViewItemState.Failure: {
                return 'failure';
            }
        }
    }
    getIcon() : string | null {
        const suffix = `${JenkinsTreeViewItem.getStateSuffix(this.state)}.svg`;
        switch(this.type) {
            case TreeViewItemType.MasterNode: {
                return `master-${suffix}`;
            }
            case TreeViewItemType.SlaveNode: {
                return `slave-${suffix}`;
            }
            case TreeViewItemType.Build: {
                return `build-${suffix}`;
            }
            case TreeViewItemType.Branch: {
                return `branch-${suffix}`;
            }
            case TreeViewItemType.Node: {
                return `node-${suffix}`;
            }
        }
        return null;
    }
}

export class JenkinsTree {
    public api : JenkinsApi;
    public root : JenkinsTreeViewItem[];
    public registry : Map<string, JenkinsTreeViewItem>;
    constructor(api : JenkinsApi) {
        this.api = api;
        this.root = [];
        this.registry = new Map();
    }
    static createNode(res : any) : JenkinsTreeViewItem {
        const id = res.url;
        const type = JenkinsTree.classToType(res._class);
        const label = JenkinsTree.resToLabel(res, type);
        const node = new JenkinsTreeViewItem(id, label, type);
        const children = JenkinsTree.resToChildren(res, type);
        node.setChildren(children);
        node.state = JenkinsTree.resToState(res, type);
        return node;
    }
    rebuild() {
        this.root = [];
    }
    search(name : string) : Thenable<JenkinsTreeViewItem|null> {
        return this.api.suggest(name)
            .then((res) => {
                const { suggestions } = res;
                const item = suggestions.map((suggestion : any) => {
                    const pieces = suggestion.name.split(' ');
                    return {
                        id: pieces.pop(),
                        name: suggestion.name,
                    };
                }).find((el : any) => el.id === name);
                if (!item) {
                    return null;
                }
                return this.api.search(item.name)
                    .then((urlMaybe) => {
                        if (!urlMaybe) {
                            return Promise.resolve(null);
                        }
                        return this.getNode(urlMaybe);
                    });
            });
    }
    getNode(uri : string) : Thenable<JenkinsTreeViewItem> {
        const node = this.registry.get(uri);
        if (node) {
            return Promise.resolve(node);
        }
        return this.api.getFromUrl(uri)
            .then((res) => {
                const node = JenkinsTree.createNode(res);
                node.populated = true;
                this.registry.set(uri, node);
                return node;
            });
    }
    getBuilds() {
        return this.getNode(this.api.host)
            .then(node => node.children);
    }
    getNodes() {
        return this.getNode(`${this.api.host}/computer${this.api.apiSuffix}`)
            .then(node => node.children);
    }
    getChildren(element : JenkinsTreeViewItem) {
        if (!element) {
            return this.root;
        }
        return this.getNode(element.url)
            .then(node => node.children);
    }
    static classToType(cla : string) : TreeViewItemType {
        switch (cla) {
        case 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject': {
            return TreeViewItemType.MultiBranch;
        }
        case 'jenkins.branch.OrganizationFolder': {
            return TreeViewItemType.Org;
        }
        case 'hudson.matrix.MatrixBuild':
        case 'hudson.model.FreeStyleBuild':
        case 'org.jenkinsci.plugins.workflow.job.WorkflowRun': {
            return TreeViewItemType.Build;
        }
        case 'org.jenkinsci.plugins.workflow.job.WorkflowJob': {
            return TreeViewItemType.Branch;
        }
        case 'hudson.model.Hudson': {
            return TreeViewItemType.JenkinsRoot;
        }
        case 'hudson.matrix.MatrixProject':
        case 'hudson.model.FreeStyleProject': {
            return TreeViewItemType.Project;
        }
        case 'hudson.model.ComputerSet': {
            return TreeViewItemType.ComputerSet;
        }
        case 'hudson.model.Hudson$MasterComputer': {
            return TreeViewItemType.MasterNode;
        }
        case 'hudson.slaves.SlaveComputer': {
            return TreeViewItemType.SlaveNode;
        }
        }
        return TreeViewItemType.Unknown;
    }
    static resToLabel(res : any, type : TreeViewItemType) : string {
        switch (type) {
            case TreeViewItemType.Branch:
            case TreeViewItemType.Project:
            case TreeViewItemType.Org:
            case TreeViewItemType.MasterNode:
            case TreeViewItemType.SlaveNode:
            case TreeViewItemType.MultiBranch: {
                return res.displayName || res.name;
            }
            case TreeViewItemType.Build: {
                return `#${res.number.toString()}`;
            }
            case TreeViewItemType.ComputerSet: {
                return 'Nodes';
            }
            case TreeViewItemType.JenkinsRoot: {
                return 'Jenkins';
            }
        }
        return '';
    }
    static resToChildren(res : any, type : TreeViewItemType) : JenkinsTreeViewItem[] {
        let childrenArray : any[] = [];
        switch (type) {
            case TreeViewItemType.JenkinsRoot:
            case TreeViewItemType.Org:
            case TreeViewItemType.MultiBranch: {
                childrenArray = res.jobs || [];
                break;
            }
            case TreeViewItemType.Project:
            case TreeViewItemType.Branch: {
                childrenArray = res.builds || [];
                break;
            }
            case TreeViewItemType.ComputerSet: {
                childrenArray = res.computer || [];
                break;
            }
        }
        return childrenArray.map(child => JenkinsTree.createNode(child));
    }
    static resToState(res : any, type : TreeViewItemType) : TreeViewItemState {
        switch (type) {
            case TreeViewItemType.JenkinsRoot:
            case TreeViewItemType.Org:
            case TreeViewItemType.MultiBranch: {
                return TreeViewItemState.Unknown;
            }
            case TreeViewItemType.Project:
            case TreeViewItemType.Branch: {
                return TreeViewItemState.Unknown;
            }
            case TreeViewItemType.MasterNode:
            case TreeViewItemType.SlaveNode: {
                return res.offline ? TreeViewItemState.Failure : TreeViewItemState.Success;
            }
        }
        return TreeViewItemState.Unknown;
    }
}
import * as vscode from 'vscode';
import { JenkinsTree } from './jenkins-tree-view-item';
import { JenkinsTreeViewItem, TreeViewItemType } from './jenkins-tree-view-item';
import * as path from 'path';

export class JenkinsJobTreeViewProvider implements vscode.TreeDataProvider<JenkinsTreeViewItem> {
    public workspaceName : string | null = null;
    public tree : JenkinsTree;
    private root : JenkinsTreeViewItem[] = [];
    private emitter : vscode.EventEmitter<JenkinsTreeViewItem> = new vscode.EventEmitter<JenkinsTreeViewItem>();
    public onDidChangeTreeData : vscode.Event<JenkinsTreeViewItem>;
    public context : vscode.ExtensionContext;
    constructor(context : vscode.ExtensionContext, tree : JenkinsTree) {
        this.context = context;
        this.onDidChangeTreeData = this.emitter.event;
        this.tree = tree;
    }
    setWorkspaceName(name : string) {
        this.workspaceName = name;
        this.updateJob();
    }
    updateJob() {
        if (this.workspaceName === null) {
            return;
        }
        // this.findJobForName(this.workspaceName);
    }
    // findJobForName(name : string) {
    //     this.api.list(3, ['name', 'url'])
    //         .then((res) => {
    //             const job = this.findJobForJobs(res.jobs, name);
    //             return this.api.getJobInfo(job.url);
    //         })
    //         .then((jobInfo) => {
    //             const jobItem = JenkinsTreeViewItem.jobToTreeItem(jobInfo);
    //             if (jobItem === null) {
    //                 return;
    //             }
    //             this.root = [jobItem];
    //             this.emitter.fire();
    //         });

    // }
    findJobForJobs(jobs : any[], name : string) : any {
        for (let i = 0; i< jobs.length; i += 1) {
            if (jobs[i].name === name) {
                return jobs[i];
            }
            if (jobs[i].jobs) {
                const found = this.findJobForJobs(jobs[i].jobs, name);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    getTreeItem(element : JenkinsTreeViewItem) : vscode.TreeItem {
        const item = new vscode.TreeItem(element.label);
        item.collapsibleState = element.type === TreeViewItemType.MultiBranch
                            || element.type === TreeViewItemType.Branch ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        const icon = element.getIcon();
        if (icon !== null) {
            item.iconPath = this.context.asAbsolutePath(path.join('resources/icons', icon));
        }
        return item;
    }
    getChildren(element : JenkinsTreeViewItem) : Thenable<JenkinsTreeViewItem[]> | JenkinsTreeViewItem[] {
        if (!element) {
            return this.root;
        }
        // if (element.type === TreeViewItemType.MultiBranch) {
        //     return this.api.getJobInfo(element.url)
        //         .then((res: any) => res.jobs.map((job : any) => JenkinsTreeViewItem.jobToTreeItem(job)));
        // }
        // if (element.type === TreeViewItemType.Branch) {
        //     return this.api.getJobInfo(element.url)
        //         .then((res: any) => res.builds.map((build : any) => JenkinsJobTreeViewProvider.buildToTreeItem(build)));
        // }
        return element.children;
    }
    // static buildToTreeItem(build : any) : JenkinsTreeViewItem {
    //     const type = JenkinsTreeViewItem.classToType(build._class);
    //     const item = new JenkinsTreeViewItem(build.number.toString(), type, build.url);
    //     if (build.color) {
    //         item.color = build.color;
    //     }
    //     return item;
    // }
}
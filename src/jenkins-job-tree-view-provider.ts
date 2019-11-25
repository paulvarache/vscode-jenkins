import * as vscode from 'vscode';
import { JenkinsTree } from './jenkins-tree-view-item';
import { JenkinsTreeViewItem } from './jenkins-tree-view-item';
import { JenkinsTreeViewJobProvider } from './tree-data-providers/jenkins-tree-view-job-provider';
import * as path from 'path';

export class JenkinsJobTreeViewProvider implements vscode.TreeDataProvider<JenkinsTreeViewItem> {
    public workspaceName : string | null = null;
    public tree : JenkinsTree;
    private root : JenkinsTreeViewItem[] = [];
    private emitter = new vscode.EventEmitter<JenkinsTreeViewItem>();
    public onDidChangeTreeData : vscode.Event<JenkinsTreeViewItem>;
    public context : vscode.ExtensionContext;
    constructor(context : vscode.ExtensionContext, tree : JenkinsTree) {
        this.context = context;
        this.onDidChangeTreeData = this.emitter.event;
        this.tree = tree;
    }
    /**
     * Update the current workspace. This will try to find a matching job and update the tree if it does
     * @param name The name of the current workspace being used
     */
    setWorkspaceName(name : string) : void {
        // No change here
        if (name === this.workspaceName) {
            return;
        }
        this.workspaceName = name;
        this.updateJob();
    }
    rebuildTree() {
        this.tree.rebuild();
        if (this.workspaceName) {
            this.findJobForName(this.workspaceName);
        }
    }
    updateJob() {
        if (this.workspaceName === null) {
            return;
        }
        this.findJobForName(this.workspaceName);
    }
    findJobForName(name : string) {
        this.tree.search(name)
            .then((jobItem) => {
                if (!jobItem) {
                    return;
                }
                this.root = [jobItem];
                this.emitter.fire();
            });

    }
    getTreeItem(element : JenkinsTreeViewItem) : vscode.TreeItem {
        const item = new vscode.TreeItem(element.label);
        item.collapsibleState = JenkinsTreeViewJobProvider.getCollapsibleState(element);
        const icon = element.getIcon();
        if (icon !== null) {
            item.iconPath = this.context.asAbsolutePath(path.join('resources/icons', icon));
        }
        item.contextValue = element.getContextValue();
        item.command = {
            title: 'open logs',
            tooltip: 'Show log output',
            arguments: [element],
            command: 'jenkins.openLogs',
        };
        return item;
    }
    getChildren(element : JenkinsTreeViewItem) : Thenable<JenkinsTreeViewItem[]> | JenkinsTreeViewItem[] {
        if (!element) {
            return this.root;
        }
        return this.tree.getChildren(element);
    }
}

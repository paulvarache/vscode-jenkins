import * as vscode from 'vscode';
import { JenkinsTree } from '../jenkins-tree-view-item';
import { JenkinsTreeViewItem } from '../jenkins-tree-view-item';
import * as path from 'path';

export class JenkinsTreeViewNodeProvider implements vscode.TreeDataProvider<JenkinsTreeViewItem> {
    public tree : JenkinsTree;
    private emitter = new vscode.EventEmitter<JenkinsTreeViewItem>();
    public onDidChangeTreeData : vscode.Event<JenkinsTreeViewItem>;
    public context : vscode.ExtensionContext;
    constructor(context : vscode.ExtensionContext, tree : JenkinsTree) {
        this.context = context;
        this.onDidChangeTreeData = this.emitter.event;
        this.tree = tree;
        this.rebuildTree();
    }
    getTreeItem(element : JenkinsTreeViewItem) : vscode.TreeItem {
        const item = new vscode.TreeItem(element.label);
        item.collapsibleState = vscode.TreeItemCollapsibleState.None;
        const icon = element.getIcon();
        if (icon !== null) {
            item.iconPath = this.context.asAbsolutePath(path.join('resources/icons', icon));
        }
        item.contextValue = element.getContextValue();
        return item;
    }
    getChildren(element : JenkinsTreeViewItem) : Thenable<JenkinsTreeViewItem[]> | JenkinsTreeViewItem[] {
        if (!element) {
            return this.tree.getNodes();
        }
        return this.tree.getChildren(element);
    }
    rebuildTree() {
        this.tree.rebuild();
        this.emitter.fire();
    }
}
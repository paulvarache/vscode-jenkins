import * as vscode from 'vscode';
import { JenkinsTree } from '../jenkins-tree-view-item';
import { JenkinsTreeViewItem, TreeViewItemType } from '../jenkins-tree-view-item';
import * as path from 'path';

export class JenkinsTreeViewJobProvider implements vscode.TreeDataProvider<JenkinsTreeViewItem> {
    public tree : JenkinsTree;
    private emitter : vscode.EventEmitter<JenkinsTreeViewItem> = new vscode.EventEmitter<JenkinsTreeViewItem>();
    public onDidChangeTreeData : vscode.Event<JenkinsTreeViewItem>;
    public context : vscode.ExtensionContext;
    constructor(context : vscode.ExtensionContext, tree : JenkinsTree) {
        this.context = context;
        this.onDidChangeTreeData = this.emitter.event;
        this.tree = tree;
        this.rebuildTree();
    }
    static getCollapsibleState(element : JenkinsTreeViewItem) : vscode.TreeItemCollapsibleState {
        switch (element.type) {
            case TreeViewItemType.Org:
            case TreeViewItemType.MultiBranch:
            case TreeViewItemType.Branch:
            case TreeViewItemType.Project: {
                return vscode.TreeItemCollapsibleState.Collapsed;
            }
            case TreeViewItemType.Build: {
                return vscode.TreeItemCollapsibleState.None;
            }
        }
        return vscode.TreeItemCollapsibleState.None;
    }
    getTreeItem(element : JenkinsTreeViewItem) : vscode.TreeItem {
        const item = new vscode.TreeItem(element.label);
        item.collapsibleState = JenkinsTreeViewJobProvider.getCollapsibleState(element);
        const icon = element.getIcon();
        if (icon !== null) {
            item.iconPath = this.context.asAbsolutePath(path.join('resources/icons', icon));
        }
        item.contextValue = element.getContextValue();
        return item;
    }
    getChildren(element : JenkinsTreeViewItem) : Thenable<JenkinsTreeViewItem[]> | JenkinsTreeViewItem[] {
        if (!element) {
            return this.tree.getBuilds();
        }
        return this.tree.getChildren(element);
    }
    rebuildTree() {
        this.emitter.fire();
    }
}
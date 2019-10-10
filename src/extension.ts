'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JenkinsApi } from './api';
import { JenkinsTree, JenkinsTreeViewItem, TreeViewItemType } from './jenkins-tree-view-item';
import { JenkinsJobTreeViewProvider } from './jenkins-job-tree-view-provider';
import { JenkinsTreeViewJobProvider } from './tree-data-providers/jenkins-tree-view-job-provider';
import { JenkinsTreeViewNodeProvider } from './tree-data-providers/jenkins-tree-view-node-provider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let tree;

    function getApi() {
        const { endpoint, token, username } = vscode.workspace.getConfiguration('jenkins');
    
        const host = `https://${endpoint}`;
    
        return new JenkinsApi(host, username, token);
    }

    function getTree() {
        const api = getApi();
        return new JenkinsTree(api);
    }

    tree = getTree();

    const jobProvider = new JenkinsJobTreeViewProvider(context, tree);
    const jobsProvider = new JenkinsTreeViewJobProvider(context, tree);
    const nodesProvider = new JenkinsTreeViewNodeProvider(context, tree);

    vscode.window.registerTreeDataProvider('jenkins-job', jobProvider);
    vscode.window.registerTreeDataProvider('jenkins-container-jobs', jobsProvider);
    vscode.window.registerTreeDataProvider('jenkins-container-nodes', nodesProvider);

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('jenkins')) {
            vscode.commands.executeCommand('jenkins.refreshJobs');
        }
        tree = getTree();
        jobsProvider.tree = tree;
        nodesProvider.tree = tree;
        jobProvider.tree = tree;
    });

    function updateWorkspace(uri : vscode.Uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return;
        }
        jobProvider.setWorkspaceName(workspaceFolder.name);
    }

    vscode.workspace.onDidOpenTextDocument((event) => {
        updateWorkspace(event.uri);
    });

    const { activeTextEditor } = vscode.window;

    if (activeTextEditor) {
        const { document } = activeTextEditor;
        updateWorkspace(document.uri);
    }

    let disposable = vscode.commands.registerCommand('jenkins.openLogs', (element : JenkinsTreeViewItem) => {
        if (!element || element.type !== TreeViewItemType.Build) {
            return;
        }
        const api = getApi();
        const jobUrl = vscode.Uri.parse(element.url);
        const stream = api.streamConsole(jobUrl.toString(), 1000);

        const writeEmitter = new vscode.EventEmitter<string>();
        const cb = (chunk : Buffer) => {
            writeEmitter.fire(chunk.toString());
        };
        const pty : vscode.Pseudoterminal = {
            onDidWrite: writeEmitter.event,
            open: () => {
                stream.on('data', cb);
            },
            close: () => {
                stream.removeListener('data', cb);
            },
        };

        const terminal = vscode.window.createTerminal({ name: jobUrl.path, pty });
        terminal.show();
    });
    let refreshJobs = vscode.commands.registerCommand('jenkins.refreshJobs', () => {
        // The code you place here will be executed every time your command is executed
        jobsProvider.rebuildTree();
        // Display a message box to the user
        vscode.window.showInformationMessage('Refreshed jobs');
    });
    let refreshNodes = vscode.commands.registerCommand('jenkins.refreshNodes', () => {
        // The code you place here will be executed every time your command is executed
        nodesProvider.rebuildTree();
        // Display a message box to the user
        vscode.window.showInformationMessage('Refreshed nodes');
    });
    let refreshJob = vscode.commands.registerCommand('jenkins.refreshJob', () => {
        // The code you place here will be executed every time your command is executed
        jobProvider.rebuildTree();
        // Display a message box to the user
        vscode.window.showInformationMessage('Refreshed current job');
    });

    context.subscriptions.push(disposable, refreshJobs, refreshJob, refreshNodes);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
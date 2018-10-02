'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JenkinsApi } from './api';
import { JenkinsTree, JenkinsTreeViewItem } from './jenkins-tree-view-item';
import { JenkinsJobTreeViewProvider } from './jenkins-job-tree-view-provider';
import { JenkinsTreeViewJobProvider } from './tree-data-providers/jenkins-tree-view-job-provider';
import { JenkinsTreeViewNodeProvider } from './tree-data-providers/jenkins-tree-view-node-provider';
import { TextDocumentContentProvider } from './text-document-content-provider';
import { LogFS } from './log-fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    function getApi() {
        const { endpoint, token, username } = vscode.workspace.getConfiguration('jenkins');
    
        const host = `https://${endpoint}`;
    
        return new JenkinsApi(host, username, token);
    }

    function getTree() {
        const api = getApi();
        return new JenkinsTree(api);
    }

    const jobProvider = new JenkinsJobTreeViewProvider(context, getTree());
    const jobsProvider = new JenkinsTreeViewJobProvider(context, getTree());
    const nodesProvider = new JenkinsTreeViewNodeProvider(context, getTree());


    vscode.window.registerTreeDataProvider('jenkins-job', jobProvider);
    vscode.window.registerTreeDataProvider('jenkins-container-jobs', jobsProvider);
    vscode.window.registerTreeDataProvider('jenkins-container-nodes', nodesProvider);

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-jenkins" is now active!');

    const logFS = new LogFS();

    let provider = new TextDocumentContentProvider(logFS);
    const providerRegistrations = vscode.Disposable.from(
        vscode.workspace.registerTextDocumentContentProvider(TextDocumentContentProvider.scheme, provider),
        vscode.languages.registerDocumentLinkProvider({ scheme: TextDocumentContentProvider.scheme }, provider),
    );

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('jenkins')) {
            vscode.commands.executeCommand('jenkins.refreshJobs');
        }
        jobsProvider.tree = getTree();
        nodesProvider.tree = getTree();
        jobProvider.tree = getTree();
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
        if (!element) {
            return;
        }
        const api = getApi();
        const filePath = '/test.jenkins.log';
        const inStream = api.streamConsole(element.url);
        logFS.registerLog(filePath, inStream);
        vscode.workspace.openTextDocument(vscode.Uri.parse(`jenkins-logs://autority${filePath}`))
            .then((document : vscode.TextDocument) => {
                return vscode.window.showTextDocument(document);
            }, (e) => {
                console.error(e);
            });
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

    context.subscriptions.push(disposable, providerRegistrations, refreshJobs, refreshJob, refreshNodes);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
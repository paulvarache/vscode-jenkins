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
            jobProvider.tree = getTree();
            jobsProvider.tree = getTree();
            nodesProvider.tree = getTree();
        }
    });

    vscode.workspace.onDidOpenTextDocument((event) => {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(event.uri);
        if (!workspaceFolder) {
            return;
        }
        jobProvider.setWorkspaceName(workspaceFolder.name);
    });

    let disposable = vscode.commands.registerCommand('jenkins.openLogs', (element : JenkinsTreeViewItem) => {
        if (!element) {
            return;
        }
        const api = getApi();
        const filePath = '/test.jenkins.log';
        const inStream = api.streamConsole(element.url);
        logFS.registerLog(filePath, inStream);
        // vscode.commands.executeCommand('vscode.previewHtml', vscode.Uri.parse(`jenkins-logs://autority${filePath}`))
        vscode.workspace.openTextDocument(vscode.Uri.parse(`jenkins-logs://autority${filePath}`))
            .then((document : vscode.TextDocument) => {
                return vscode.window.showTextDocument(document);
            }, (e) => {
                console.error(e);
            });
    });
    let dis = vscode.commands.registerCommand('jenkins.refreshJobs', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Referesh jobs!');
    });

    context.subscriptions.push(disposable, providerRegistrations);
    context.subscriptions.push(dis);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
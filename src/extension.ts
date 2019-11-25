import * as vscode from 'vscode';
import { JenkinsApi } from './api';
import { JenkinsTree, JenkinsTreeViewItem, TreeViewItemType } from './jenkins-tree-view-item';
import { JenkinsJobTreeViewProvider } from './jenkins-job-tree-view-provider';
import { JenkinsTreeViewJobProvider } from './tree-data-providers/jenkins-tree-view-job-provider';
import { JenkinsTreeViewNodeProvider } from './tree-data-providers/jenkins-tree-view-node-provider';

// Key used to lookup the config in the vscode settings file
// This will match the prefix provided in the configuration section of contributes in the package.json
const JENKINS_CONFIG_KEY = 'jenkins';

/**
 * Returns the JenkinsAPI instance for the current workspace configuration
 */
function getJenkinsApi() {    
    return JenkinsApi.getCurrent(vscode.workspace.getConfiguration(JENKINS_CONFIG_KEY));
}

/**
 * Returns the jobs and nodes tree representation of the current JenkinsAPI
 */
function getJenkinsTree() {
    const api = getJenkinsApi();
    return new JenkinsTree(api);
}

export function activate(context: vscode.ExtensionContext) {
    let tree;

    tree = getJenkinsTree();

    // Create 3 tree providers
    // Job displays the job matching the currently open editor
    // it is displayed in the Explorer view
    const jobProvider = new JenkinsJobTreeViewProvider(context, tree);
    // Jobs will display all jenkins jobs from that instance, in the jenkins view
    const jobsProvider = new JenkinsTreeViewJobProvider(context, tree);
    // Nodes will display all jenkins nodes from that instance, in the jenkins view
    const nodesProvider = new JenkinsTreeViewNodeProvider(context, tree);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jenkins-job', jobProvider),
        vscode.window.registerTreeDataProvider('jenkins-container-jobs', jobsProvider),
        vscode.window.registerTreeDataProvider('jenkins-container-nodes', nodesProvider),
    );

    // Update the API and Tree when the config changes
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('jenkins')) {
            tree = getJenkinsTree();
            jobsProvider.tree = tree;
            nodesProvider.tree = tree;
            jobProvider.tree = tree;
            vscode.commands.executeCommand('jenkins.refreshJobs');
            vscode.commands.executeCommand('jenkins.refreshJob');
            vscode.commands.executeCommand('jenkins.refreshNodes');
        }
    }, null, context.subscriptions);

    /**
     * Updates the workspace name given to the Job tree view
     * @param uri URI of the currently open resource
     */
    function updateWorkspace(uri : vscode.Uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return;
        }
        jobProvider.setWorkspaceName(workspaceFolder.name);
    }

    // Update the name when a new document opens
    vscode.workspace.onDidOpenTextDocument((event) => {
        updateWorkspace(event.uri);
    }, null, context.subscriptions);

    // Sets up the openLogs command
    // This command will create a new pseudo terminal with the logs of the provided jenkins tree item
    const openLogsCommand = vscode.commands.registerCommand('jenkins.openLogs', (element : JenkinsTreeViewItem) => {
        if (!element || element.type !== TreeViewItemType.Build) {
            return;
        }
        const api = getJenkinsApi();
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
    context.subscriptions.push(openLogsCommand);

    // Setup 3 command, one for each tree available
    context.subscriptions.push(
        vscode.commands.registerCommand('jenkins.refreshJobs', () => jobsProvider.rebuildTree()),
        vscode.commands.registerCommand('jenkins.refreshNodes', () => nodesProvider.rebuildTree()),
        vscode.commands.registerCommand('jenkins.refreshJob', () => jobProvider.rebuildTree()),
    );

    const { activeTextEditor } = vscode.window;

    // Update the name if an editor is already open
    if (activeTextEditor) {
        const { document } = activeTextEditor;
        updateWorkspace(document.uri);
    }
}

export function deactivate() {
}
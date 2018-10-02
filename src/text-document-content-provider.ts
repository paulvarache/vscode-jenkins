import * as vscode from 'vscode';
import { LogFS } from './log-fs';
import { JenkinsTree } from './jenkins-tree-view-item';

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider, vscode.DocumentLinkProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    public logFS : LogFS;
    public subscription : vscode.Disposable | null = null;
    public tree : JenkinsTree;

    static scheme = 'jenkins-logs';

    constructor(logFS : LogFS, tree : JenkinsTree) {
        this.logFS = logFS;
        this.tree = tree;
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.snippet(uri);
    }

    provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] {
        const text = document.getText();
        const lines = text.split(`\n`);
        const links : vscode.DocumentLink[] = [];
        lines.forEach((line, index) => {
            const m = /(Running on )(.+)( in )(.+)/.exec(line);
            if (m) {
                m.shift();
                const start = m[0].length;
                const end = start + m[1].length;
                const name = m[1];
                const node = this.tree.getComputerNodeByName(name);
                if (!node) {
                    return;
                }
                links.push(
                    new vscode.DocumentLink(new vscode.Range(
                        new vscode.Position(index, start),
                        new vscode.Position(index, end)),
                    vscode.Uri.parse((node.url))),
                );
            }
        });
        return links;
	}

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        if (this.subscription) {
            this.subscription.dispose();
        }
        this._onDidChange.fire(uri);
        setTimeout(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const { uri } = editor.document;
                if (uri.scheme === 'jenkins-logs') {
                    editor.revealRange(new vscode.Range(new vscode.Position(editor.document.lineCount, 0), new vscode.Position(editor.document.lineCount, 0)));
                }
            }
        }, 1000);
    }

    private snippet(uri : vscode.Uri) : string {
        const name = uri.path;
        const log = this.logFS.getLog(decodeURIComponent(name));
        if (!log) {
            return '';
        }
        this.subscription = log.onDidChange(() => this.update(uri));
        return log.contents;
    }
}
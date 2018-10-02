import { Readable } from 'stream';
import * as vscode from 'vscode';

export class RemoteLog {
    public contents : string;
    public stream : Readable;
    private _onDidChange = new vscode.EventEmitter<string>();
    constructor(stream : Readable) {
        this.stream = stream;
        this.contents = '';
        this.stream.on('data', (data) => {
            this.contents = `${this.contents}${data.toString()}`;
            this._onDidChange.fire(this.contents);
        });
    }
    get onDidChange(): vscode.Event<string> {
        return this._onDidChange.event;
    }
}

export class LogFS {
    public logs : Map<string, RemoteLog> = new Map<string, RemoteLog>();
    public contents : Map<string, string> = new Map<string, string>();
    registerLog(path : string, stream : Readable) {
        const remoteLog = new RemoteLog(stream);
        this.logs.set(path, remoteLog);
    }
    getLog(path : string) : RemoteLog | null {
        return this.logs.get(path) || null;
    }
}
import fetch from 'node-fetch';
import { Readable } from 'stream';
import * as FormData from 'form-data';

const API = '/api/json';

function createFilters(depth : number = 1, filters : string[] = [], name : string) : string {
    if (depth === 1) {
        return `${name}[${filters.join(',')}]`;
    }
    return `${name}[${filters.join(',')},${createFilters(depth - 1, filters, name)}]`;
}

const URLS: any = {
    list(depth : number = 1, filters : string[] = []) {
        const tree = createFilters(depth, filters, 'jobs');
        return `${API}?tree=${tree}&depth=${depth}`;
    },
    computers(){
        return `/computer${API}`;
    },
    suggest(name : string) {
        return `/search/suggest?query=${name}`;
    },
    search(name : string) {
        return `/search/?q=${name.replace(/\s/g, '+')}`;
    }
};

interface ConsoleChunk {
    text : string;
    ended : boolean;
    pointer : number;
}

export class JenkinsApi {
    public host : string;
    public username : string;
    public token : string;
    public headers : any;
    constructor(host : string, username : string, token : string) {
        this.host = host;
        this.username = username;
        this.token = token;

        const auth = new Buffer(`${this.username}:${this.token}`).toString('base64');

        this.headers = {
            Authorization: `Basic ${auth}`,
        };
    }
    buildUrl(id : string, ...args : any[]) {
        return `${this.host}${URLS[id](...args)}`;
    }
    list(depth : number = 1, filters : string[] = ['name']) : Thenable<any> {
        return fetch(this.buildUrl('list', depth, filters), { headers: this.headers })
                .then(r => r.json());
    }
    getJobInfo(url : string) : Thenable<any> {
        return fetch(`${url}${API}`, { headers: this.headers })
                .then(r => r.json());
    }
    getBuilds(url : string) : Thenable<any> {
        return fetch(`${url}/build${API}`, { headers: this.headers })
                .then(r => r.json());
    }
    listComputers() : Thenable<any> {
        return fetch(this.buildUrl('computers'), { headers: this.headers })
                .then(r => r.json());
    }
    console(url : string, start : number = 0) : PromiseLike<ConsoleChunk> {
        const form = new FormData();
        form.append('start', start);
        return fetch(`${url}/logText/progressiveText`, {
            headers: this.headers,
            method: 'POST',
            body: form,
        }).then((r) => {
            return r.text()
                .then((text) => {
                    return {
                        text,
                        ended: r.headers.get('X-More-Data') === null,
                        pointer: parseInt(r.headers.get('X-Text-Size') || '0', 10),
                    };
                });
        });
    }
    streamConsole(url : string, refreshRate : number = 1000) : Readable {
        const stream = new Readable({ read() {} });
        const queryNext = (pointer : number) : PromiseLike<number> | number => {
            return this.console(url, pointer)
                .then((res : ConsoleChunk) : PromiseLike<number> | number => {
                    if (res.ended) {
                        stream.push(res.text);
                        stream.push(null);
                        return -1;
                    }
                    stream.push(res.text);
                    return new Promise(resolve => setTimeout(resolve, refreshRate))
                        .then(() => queryNext(res.pointer));
                });
        };
        queryNext(0);
        return stream;
    }
    getFromUrl(url : string) {
        return fetch(`${url}${API}`, { headers: this.headers })
            .then(r => r.json());
    }
    suggest(name : string) : Thenable<any> {
        return fetch(this.buildUrl('suggest', name), { headers: this.headers })
            .then(r => r.json());

    }
    search(name : string) : Thenable<string|null> {
        return fetch(this.buildUrl('search', name), { headers: this.headers, redirect: 'manual' })
            .then(r => {
                if (r.status === 302) {
                    const location = r.headers.get('location');
                    if (!location) {
                        return null;
                    }
                    return location.slice(0, -1);
                }
                return null;
            });

    }
    get apiSuffix() : string {
        return API;
    }
}

import test from 'ava';
import schema from 'github/lib/routes.json';
import definitions from 'github/lib/definitions.json';
import fixtures from '@octokit/fixtures';
import getClient from '../index';
import fs from 'fs';
import path from 'path';
import utils from '../utils';

const regexpCache = new Map();
const getRegexpForPath = (url) => {
    if(!regexpCache.has(url)) {
        regexpCache.set(url, `^${url.replace(/:[^/]+/g, '[^/]*')}$`);
    }
    return regexpCache.get(url);
};

const cleanURL = (url) => url.substr(1)
    .split("?")
    .shift();

const getClientMethod = (request) => {
    const cleanedPath = cleanURL(request.path);
    for(const ns in schema) {
        for(const method in schema[ns]) {
            const m = schema[ns][method];
            if(m.method.toLowerCase() === request.method.toLowerCase() && cleanedPath.search(new RegExp(getRegexpForPath(cleanURL(m.url)))) !== -1) {
                return [
                    ns,
                    method
                ];
            }
        }
    }
    return [];
};

const getParam = (method, name) => {
    if(name in method.params) {
        return method.params[name];
    }
    else if(`$${name}` in method.params) {
        return definitions.params[name];
    }
    return false;
};

const normalizeParam = (value, type) => {
    switch(type) {
    case "Number":
        return parseInt(value, 10);
    case "String":
        return value.toString();
    case "Json":
        if(typeof value === "object") {
            return JSON.stringify(value);
        }
        return value.toString();
    default:
        return value;
    }
};

const getParams = (request, ns, method) => {
    const params = {};
    const m = schema[ns][method];

    if(m.url.includes(':')) {
        const parts = cleanURL(m.url).split("/");
        const fixtureParts = cleanURL(request.path).split("/");
        for(const p in parts) {
            if(parts[p].startsWith(":")) {
                const name = parts[p].substr(1);
                const param = getParam(m, name);
                params[name] = normalizeParam(fixtureParts[p], param.type);
            }
        }
    }

    if(request.path.includes("?")) {
        const get = request.path
            .split("?")
            .pop()
            .split("&");
        for(const p of get) {
            const [
                name,
                value
            ] = p.split("=");
            const param = getParam(m, name);
            if(param) {
                params[name] = normalizeParam(decodeURIComponent(value), param.type);
            }
        }
    }

    let bodyConsumed = false;
    if(m.requestFormat === "raw") {
        params.data = request.body;
        bodyConsumed = true;
    }

    if(!bodyConsumed) {
        for(const p in m.params) {
            const param = getParam(m, p);
            if(param && param.sendValueAsBody) {
                params[p] = request.body;
                bodyConsumed = true;
            }
        }
    }

    if(!bodyConsumed && typeof request.body === "object" && !Array.isArray(request.body)) {
        for(const p in request.body) {
            const param = getParam(m, p);
            if(param) {
                params[p] = normalizeParam(request.body[p], param.type);
            }
        }
    }

    for(const p in m.params) {
        if(!p.startsWith("$") && m.params[p].required && !(p in params)) {
            if(p === "filePath") {
                params[p] = '/tmp/file';
            }
            else {
                throw new Error(`Missing param ${p} for ${request.path}`);
            }
        }
    }

    return params;
};

const testFixture = async (t, request) => {
    const [
        ns,
        method
    ] = getClientMethod(request);

    if(!ns && !method) {
        t.pass(`No API wrapper for [${request.method.toUpperCase()}] ${request.path} found.`);
        return;
    }

    const params = getParams(request, ns, method);

    const client = getClient();
    const ccMethod = utils.toCamelCase(method);

    await client[ns][ccMethod](params);

    client[ns][ccMethod].argumentsValid((a, m) => t.true(a, m));
};
testFixture.title = (title, request) => `${title} => ${request.path}`;

const fixturesPath = path.dirname(require.resolve('@octokit/fixtures'));
const files = fs.readdirSync(path.join(fixturesPath, 'scenarios/api.github.com'));
for(const scenario of files) {
    const fixture = fixtures.get(`api.github.com/${scenario}`);
    for(const request of fixture) {
        test(scenario, testFixture, request);
    }
}
import test from 'ava';
import schema from '@octokit/rest/lib/routes.json';
import fixtures from '@octokit/fixtures';
import getClient from '..';
import fs from 'fs';
import path from 'path';

const regexpCache = new Map();
const getRegexpForPath = (url, noSlashes = true) => {
    let regexp = `^${url.replace(/:[^/]+/g, '[^/]*')}$`;
    if(!noSlashes) {
        regexp = `^${url.replace(/:[^/]+/g, '.*')}$`;
    }
    if(!regexpCache.has(url)) {
        regexpCache.set(url, regexp);
    }
    return regexpCache.get(url);
};

const cleanURL = (url) => url.substr(1)
    .split("?")
    .shift();

const SLASHED_PLACEHOLDERS = [
    'ref',
    'url'
];

const getParam = (method, name) => {
    if(name in method.params) {
        return method.params[name];
    }
    return false;
};

const canContainSlashes = (url) => SLASHED_PLACEHOLDERS.some((p) => url.includes(`:${p}`));
const getRegexpForMethod = (method) => {
    let cleanedURL = cleanURL(method.url);
    for(const param in method.params) {
        const inURL = `:${param}`;
        if(cleanedURL.includes(inURL)) {
            const p = getParam(method, inURL.substr(1));
            if(p && p.validation && p.validation.length) {
                let validationRegexp = p.validation;
                if(validationRegexp.startsWith('^')) {
                    validationRegexp = validationRegexp.substr(1);
                }
                if(validationRegexp.endsWith('$')) {
                    validationRegexp = validationRegexp.substr(0, validationRegexp.length - 1);
                }
                cleanedURL = cleanedURL.replace(inURL, `(${validationRegexp})`);
            }
            else if(p && p.enum && p.enum.length) {
                const enumRegexp = `(${p.enum.join('|')})`;
                cleanedURL = cleanedURL.replace(inURL, enumRegexp);
            }
        }
    }
    return new RegExp(getRegexpForPath(cleanedURL, !canContainSlashes(cleanedURL)));
};

const getClientMethod = (request) => {
    const cleanedPath = cleanURL(request.path);
    for(const ns in schema) {
        for(const method in schema[ns]) {
            const m = schema[ns][method];
            // Skip upload asset method for most fixtures.
            if((method === "upload-asset" && !cleanedPath.includes('release-assets')) ||
                (request.method.toLowerCase() === "post" && method !== "upload-asset" && cleanedPath.includes('release-assets'))) {
                continue;
            }
            else if(m.method.toLowerCase() === request.method.toLowerCase() && cleanedPath.search(getRegexpForMethod(m)) !== -1) {
                return [
                    ns,
                    method
                ];
            }
        }
    }
    return [];
};


const normalizeParam = (value, type) => {
    switch(type) {
    case "number":
        return parseInt(value, 10);
    case "string":
        return value.toString();
    case "json":
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
            if(param && param.mapTo === 'input') {
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
        bodyConsumed = true;
    }

    const headerProperty = 'headers.';
    for(const p in m.params) {
        if(m.params[p].required && !(p in params)) {
            if(p === "filePath") {
                params[p] = '/tmp/file';
            }
            else if(p === "file" && !bodyConsumed) {
                params[p] = request.body;
                bodyConsumed = true;
            }
            else if(m.params[p].mapTo.startsWith(headerProperty)) {
                const header = m.params[p].mapTo.substr(headerProperty.length);
                params[p] = request.reqheaders[header];
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

    await client[ns][method](params);

    client[ns][method].argumentsValid((a, m) => t.true(a, m));
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

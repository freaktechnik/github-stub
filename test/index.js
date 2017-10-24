import test from 'ava';
import schema from 'github/lib/routes.json';
import getClient from '../index';
import utils from '../utils';
import sinon from 'sinon';

const STRING_ARGS = [
    "Foo",
    "none",
    "1",
    "top",
    "first"
];
const getBestStringArg = (spec) => {
    if("validation" in spec) {
        for(const string of STRING_ARGS) {
            if(string.search(new RegExp(spec.validation)) !== -1) {
                return string;
            }
        }
        console.warn("No valid string arg for", spec.validation);
    }
    return STRING_ARGS[0];
};
const getArgValueForSpec = (spec) => {
    if("default" in spec) {
        if(typeof spec.default === "string") {
            if(spec.type === "Boolean") {
                return spec.default === "true";
            }
            else if(spec.type === "Number") {
                return parseInt(spec.default, 10);
            }
            else if(spec.type === "Array") {
                return JSON.parse(spec.default);
            }
        }
        return spec.default;
    }

    if("enum" in spec && spec.enum.length) {
        return spec.enum[0];
    }

    switch(spec.type) {
    case "String":
        return getBestStringArg(spec);
    case "Number":
        return 1;
    case "Boolean":
        return true;
    case "Date":
        return "1999-12-31T23:00:00Z";
    case "Array":
        return [
            'foo',
            'bar'
        ];
    case "Json":
        return JSON.stringify({});
    default:
    }

    return "Foo";
};
const resolveParams = (params) => {
    const p = Object.assign({}, params);

    for(const param in params) {
        if(param[0] === '$') {
            const name = param.substr(1);
            p[name] = schema.defines.params[name];
            delete p[param];
        }
    }
    return p;
};

const TOP_LEVEL_METHODS = [
    'hasNextPage',
    'getNextPage',
    'argumentsValid',
    'reset'
];

const testMethod = (t, property) => {
    t.is(typeof property, "function");
};
testMethod.title = (title, property, name) => `${title} ${name}`;

const testArgumentsValid = (t, property, name, spec) => {
    t.true("argumentsValid" in property);
    t.is(typeof property.argumentsValid, "function");

    property({
        foo: 'bar'
    });
    const assert = sinon.spy();
    property.argumentsValid(assert);
    t.true(assert.called);

    property();
    assert.reset();
    property.argumentsValid(assert);
    t.true(assert.called);

    const params = {};
    const resolved = resolveParams(spec.params);
    for(const param in resolved) {
        const paramSpec = resolved[param];
        params[param] = getArgValueForSpec(paramSpec);
    }
    property(params);
    const spyAssertTrue = sinon.spy(t.true.bind(t));
    property.argumentsValid(spyAssertTrue);
    t.true(spyAssertTrue.called);

    if(Object.values(resolved).some((p) => p.type === "Json")) {
        for(const param in resolved) {
            if(resolved[param].type === "Json") {
                params[param] = "{;}";
            }
        }
        property(params);
        assert.reset();
        property.argumentsValid(assert);
        t.true(assert.called);
        t.true(assert.calledWith(false, 'Can not parse JSON'));
    }

    property({}, true);
    const spyAssertFalse = sinon.spy(t.false.bind(t));
    property.argumentsValid(spyAssertFalse);
    t.true(spyAssertFalse.called);
};
testArgumentsValid.title = (title, property, name) => `${title} ${name}`;

const testNamespace = (t, namespace, ns) => {
    t.true(ns in schema);
    t.is(typeof namespace, "object");
    const referenceNS = schema[ns];
    for(const method in referenceNS) {
        const camelCased = utils.toCamelCase(method);
        t.true(camelCased in namespace);
    }
};
testNamespace.title = (title, n, ns) => `${title} ${ns}`;

test('export', (t) => {
    t.is(typeof getClient, "function");
});

test('base', (t) => {
    const object = getClient();
    t.is(typeof object, "object");
    for(const p in schema) {
        if(p !== "defines") {
            t.true(p in object);
        }
    }

    for(const m of TOP_LEVEL_METHODS) {
        t.true(m in object);
        t.is(typeof object[m], 'function');
    }
});

test('assert is never called with fresh stub', (t) => {
    const object = getClient();
    const assert = sinon.spy((a, message) => t.fail(message));
    object.argumentsValid(assert);
    t.false(assert.called);
});

test('Top level arguments valid with called API stub', (t) => {
    const object = getClient();
    object.misc.getRateLimit({});
    const assert = sinon.spy();
    object.argumentsValid(assert);
    t.true(assert.called);
});

test('Reset', (t) => {
    const object = getClient();
    object.misc.getRateLimit.returns(true);
    object.getNextPage.returns(true);

    object.reset();

    t.falsy(object.misc.getRateLimit());
    t.falsy(object.getNextPage());
});

{
    const stubGithub = getClient();
    for(const ns in stubGithub) {
        if(typeof stubGithub[ns] === "object") {
            const namespace = stubGithub[ns];
            test('namespace', testNamespace, namespace, ns);
            for(const m in stubGithub[ns]) {
                const method = namespace[m];
                test('method', testMethod, method, m);
                test('arguments valid', testArgumentsValid, method, m, schema[ns][utils.toKebabCase(m)]);
            }
        }
    }
}

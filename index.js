"use strict";

const routes = require("github/lib/routes.json"),
    sinon = require("sinon"),
    utils = require("./utils"),
    IGNORED_NAMESPACES = [ 'defines' ],
    getResolvedParams = (params) => {
        const resolvedParams = {},
            FIRST_CHAR = 0,
            SECOND_CHAR = 1;
        for(const param in params) {
            if(param[FIRST_CHAR] === '$') {
                resolvedParams[param] = routes.defines.params[param.substr(SECOND_CHAR)];
            }
            else {
                resolvedParams[param] = params[param];
            }
        }

        return resolvedParams;
    },
    generateArgumentsValid = (spec) => {
        const params = getResolvedParams(spec.params),
            REQUIRED_PARAM_COUNT = 1,
            NOT_FOUND = -1;
        /**
         * @param {Function} assert - Assert function to use.
         * @this {SinonStub}
         * @returns {undefined}
         */
        return function(assert) {
            assert(this.lastCall.args.length <= REQUIRED_PARAM_COUNT);
            if(this.lastCall.args.length === REQUIRED_PARAM_COUNT) {
                const [ lastArgs ] = this.lastCall.args;

                for(const arg in lastArgs) {
                    assert(arg in params);
                    if(arg in params) {
                        const value = lastArgs[arg],
                            argSpec = params[arg];
                        switch(argSpec.type) {
                        case "String":
                        case "Number":
                        case "Boolean":
                            assert(typeof value === argSpec.type.toLowerCase());
                            break;
                        case "Date":
                            assert(typeof value === "string");
                            assert(utils.isISOTimestamp(value));
                            break;
                        case "Array":
                            assert(Array.isArray(value));
                            break;
                        case "Json":
                            assert(typeof value === 'string');
                            try {
                                JSON.parse(value);
                            }
                            catch(e) {
                                assert(false, 'Can not parse JSON');
                            }
                            break;
                        default:
                            assert(false, `Unknown argument type ${argSpec.type}`);
                        }

                        if("enum" in argSpec) {
                            assert(argSpec.enum.includes(value));
                        }

                        if("validation" in argSpec && argSpec.validation.length) {
                            assert(value.search(new RegExp(argSpec.validation)) !== NOT_FOUND);
                        }
                    }
                }
                for(const p in params) {
                    if(params[p].required) {
                        assert(p in lastArgs);
                    }
                }
            }
            else if(!this.lastCall.args.length) {
                assert(!Array.from(Object.values(params)).some((arg) => arg.required));
            }
        };
    },
    generateStubNamespace = (endpoints) => {
        const namespace = {};
        for(const route in endpoints) {
            const name = utils.toCamelCase(route);
            namespace[name] = sinon.stub();
            namespace[name].argumentsValid = generateArgumentsValid(endpoints[route]);
        }

        return namespace;
    },
    generateStubClient = () => {
        const client = {};
        for(const ns in routes) {
            if(!IGNORED_NAMESPACES.includes(ns)) {
                client[ns] = generateStubNamespace(routes[ns]);
            }
        }
        return client;
    };

module.exports = generateStubClient;

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
                const realName = param.substr(SECOND_CHAR);
                resolvedParams[realName] = routes.defines.params[realName];
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
         * @param {SinonCall} [call=this.lastCall] - Call to inspect.
         * @this {SinonSpy}
         * @returns {undefined}
         */
        return function(assert, call = this.lastCall) {
            if(this.called && call) {
                assert(call.args.length <= REQUIRED_PARAM_COUNT, "Too many parameters were given");
                if(call.args.length === REQUIRED_PARAM_COUNT) {
                    const [ lastArgs ] = call.args;

                    for(const arg in lastArgs) {
                        assert(arg in params, `${arg} parameter missing`);
                        if(arg in params) {
                            const value = lastArgs[arg],
                                argSpec = params[arg];
                            switch(argSpec.type) {
                            case "String":
                            case "Boolean":
                                assert(typeof value === argSpec.type.toLowerCase(), `${arg} is not of primitive type ${argSpec.type}`);
                                break;
                            case "Number": {
                                const number = parseInt(value, 10);
                                assert(!isNaN(number), `${arg} is not a valid number`);
                                break;
                            }
                            case "Date":
                                assert(typeof value === "string", `${arg} is not a Date in string form`);
                                assert(utils.isISOTimestamp(value), `${arg} is not formatted as an ISO Date`);
                                break;
                            case "Array":
                                assert(Array.isArray(value), `${arg} is not an array`);
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
                            /* istanbul ignore next */
                            default:
                                assert(false, `Unknown argument type ${argSpec.type} for ${arg}`);
                            }

                            if("enum" in argSpec) {
                                assert(argSpec.enum.includes(value), `${arg} is not in the set of allowed values of ${argSpec.enum.join(", ")}`);
                            }

                            if("validation" in argSpec && argSpec.validation.length) {
                                let stringValue = value;
                                if(argSpec.type === "Number" && typeof value === "number") {
                                    stringValue = `${value}`;
                                }
                                assert(stringValue.search(new RegExp(argSpec.validation)) !== NOT_FOUND, `${arg} does not match the required pattern of "${argSpec.validation}"`);
                            }
                        }
                    }
                    for(const p in params) {
                        if(params[p].required) {
                            assert(p in lastArgs, `${p} is required and not set`);
                        }
                    }
                }
                else if(!call.args.length) {
                    assert(!Array.from(Object.values(params)).some((arg) => arg.required), `Requires arguments but none were passed in`);
                }
            }
            else {
                assert(true, 'Not yet called');
            }
        };
    },
    /**
     * @param {Function} assert - Assertion function to use.
     * @this {SinonSpy}
     * @returns {undefined}
     */
    allArgumentsValid = function(assert) {
        for(const call of this.getCalls()) {
            this.argumentsValid(assert, call);
        }
    },
    generateStubNamespace = (endpoints) => {
        const namespace = {};
        for(const route in endpoints) {
            const name = utils.toCamelCase(route);
            namespace[name] = sinon.stub();
            namespace[name].argumentsValid = generateArgumentsValid(endpoints[route]);
            namespace[name].allArgumentsValid = allArgumentsValid;
        }

        return namespace;
    },
    generateStubClient = () => {
        const client = {
            hasNextPage: sinon.stub(),
            getNextPage: sinon.stub(),
            argumentsValid(assert) {
                for(const ns in this) {
                    if(typeof this[ns] === "object") {
                        for(const m in this[ns]) {
                            if(this[ns][m].called) {
                                this[ns][m].argumentsValid(assert);
                            }
                        }
                    }
                }
            },
            allArgumentsValid(assert) {
                for(const ns in this) {
                    if(typeof this[ns] === "object") {
                        for(const m in this[ns]) {
                            this[ns][m].allArgumentsValid(assert);
                        }
                    }
                }
            },
            reset() {
                for(const ns in this) {
                    if(typeof this[ns] === "object") {
                        for(const m in this[ns]) {
                            this[ns][m].reset();
                        }
                    }
                    else if(typeof this[ns] === "function" && "reset" in this[ns]) {
                        this[ns].reset();
                    }
                }
            }
        };
        for(const ns in routes) {
            if(!IGNORED_NAMESPACES.includes(ns)) {
                client[ns] = generateStubNamespace(routes[ns]);
            }
        }
        return client;
    };

module.exports = generateStubClient;

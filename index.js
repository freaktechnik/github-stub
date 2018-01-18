"use strict";
const routes = require("@octokit/rest/lib/routes.json"),
    sinon = require("sinon"),
    utils = require("./utils"),
    getResolvedParams = (params) => params,
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
                            case "string":
                            case "boolean":
                                assert(typeof value === argSpec.type.toLowerCase(), `${arg} is not of primitive type ${argSpec.type}`);
                                break;
                            case "number": {
                                const number = parseInt(value, 10);
                                assert(!isNaN(number), `${arg} is not a valid number`);
                                break;
                            }
                            case "date":
                                assert(typeof value === "string", `${arg} is not a Date in string form`);
                                assert(utils.isISOTimestamp(value), `${arg} is not formatted as an ISO Date`);
                                break;
                            case "json":
                                assert(typeof value === 'string', `${arg} JSON value is not a string`);
                                try {
                                    JSON.parse(value);
                                }
                                catch(e) {
                                    assert(false, 'Can not parse JSON');
                                }
                                break;
                            case "object":
                                assert(utils.isObject(value), `${arg} is not a readable stream, Buffer or string`);
                                break;
                            case "string[]":
                                assert(Array.isArray(value), `${arg} string array value is not an array`);
                                assert(value.every((v) => typeof v === "string"), `${arg} string array's items are not all strings`);
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
                                if(argSpec.type === "number" && typeof value === "number") {
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
            namespace[route] = sinon.stub();
            namespace[route].argumentsValid = generateArgumentsValid(endpoints[route]);
            namespace[route].allArgumentsValid = allArgumentsValid;
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
            client[ns] = generateStubNamespace(routes[ns]);
        }
        return client;
    };

module.exports = generateStubClient;

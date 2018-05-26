"use strict";

//TODO properly handle . for object proeprties

const routes = require("@octokit/rest/lib/routes.json"),
    sinon = require("sinon"),
    verify = require("./verify"),
    getResolvedParams = (params) => params,
    generateArgumentsValid = (spec) => {
        const params = getResolvedParams(spec.params),
            REQUIRED_PARAM_COUNT = 1;
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
                            const value = lastArgs[arg];
                            verify.argSpec(arg, value, params, assert);
                        }
                    }
                    for(const p in params) {
                        if(!p.includes(".") && params[p].required) {
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
    generateStubNamespace = (routes, ns) => {
        const namespace = {};
        for(const route in routes[ns]) {
            namespace[route] = sinon.stub();
            let spec = routes[ns][route];
            if(spec.alias) {
                const [
                    aliasNs,
                    aliasRoute
                ] = spec.alias.split(".");
                spec = routes[aliasNs][aliasRoute];
            }
            namespace[route].argumentsValid = generateArgumentsValid(spec);
            namespace[route].allArgumentsValid = allArgumentsValid;
        }

        return namespace;
    },
    generateStubClient = () => {
        const client = {
            authenticate: sinon.stub(),
            hasNextPage: sinon.stub(),
            hasPreviousPage: sinon.stub(),
            hasFirstPage: sinon.stub(),
            hasLastPage: sinon.stub(),
            getNextPage: sinon.stub(),
            getPreviousPage: sinon.stub(),
            getFirstPage: sinon.stub(),
            getLastPage: sinon.stub(),
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
            client[ns] = generateStubNamespace(routes, ns);
        }
        return client;
    };

module.exports = generateStubClient;

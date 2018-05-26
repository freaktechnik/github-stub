"use strict";

const utils = require("./utils"),
    NOT_FOUND = -1,
    START = 0,
    ONE = 1,
    ARRAY_SUFFIX = "[]";

exports.object = (arg, value, params, assert) => {
    for(const param in params) {
        if(param.startsWith(arg) && param.includes(".")) {
            const path = param.split(".");
            const count = arg.includes(".") ? arg.match(/\./g).length : START;
            // remove name of param
            for(let i = START; i <= count; ++i) {
                path.shift();
            }
            if(path.length === ONE) {
                const step = path.pop();
                if(step in value) {
                    exports.argSpec(param, value[step], params, assert);
                }
                else {
                    assert(!params[param].required, `${step} property missing for ${path} in ${arg}`);
                    break;
                }
            }
            else {
                continue;
            }
        }
    }
};

exports.type = (arg, value, type, params, assert) => {
    if(type.endsWith(ARRAY_SUFFIX)) {
        assert(Array.isArray(value), `${arg} array value is not an array`);
        const itemType = type.substr(START, type.length - ARRAY_SUFFIX.length);
        value.forEach((v) => exports.type(arg, v, itemType, params, assert));
    }
    else {
        switch(type) {
        case "string":
        case "boolean":
            assert(typeof value === type.toLowerCase(), `${arg} is not of primitive type ${type}`);
            break;
        case "number":
        case "integer": {
            const number = parseInt(value, 10);
            assert(!isNaN(number), `${arg} is not a valid number`);
            break;
        }
        // case "date":
        //     assert(typeof value === "string", `${arg} is not a Date in string form`);
        //     assert(utils.isISOTimestamp(value), `${arg} is not formatted as an ISO Date`);
        //     break;
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
        case "string | object":
            assert(utils.isObject(value), `${arg} is not a readable stream, Buffer or string`);
            if(typeof value === "object") {
                exports.object(arg, value, params, assert);
            }
            else {
                exports.type(arg, value, "json", params, assert);
            }
            break;
        /* istanbul ignore next */
        default:
            assert(false, `Unknown argument type ${type} for ${arg}`);
        }
    }
};

exports.argSpec = (arg, value, params, assert) => {
    let argSpec = params[arg];
    if(argSpec.alias) {
        argSpec = params[argSpec.alias];
    }

    if(value !== null) {
        exports.type(arg, value, argSpec.type, params, assert);
    }
    else if(value === null && !argSpec.allowNull) {
        assert(false, `${arg} may not be null`);
    }

    if("enum" in argSpec) {
        assert(argSpec.enum.includes(value), `${arg} is not in the set of allowed values of ${argSpec.enum.join(", ")}`);
    }

    if("validation" in argSpec && argSpec.validation.length) {
        let stringValue = value;
        // if(argSpec.type === "number" && typeof value === "number") {
        //     stringValue = `${value}`;
        // }
        assert(stringValue.search(new RegExp(argSpec.validation)) !== NOT_FOUND, `${arg} does not match the required pattern of "${argSpec.validation}"`);
    }
};

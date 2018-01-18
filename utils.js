"use strict";

const stream = require("stream"),
    NO_RESULTS = -1;

exports.isISOTimestamp = (value) => value.search(/^\d{4}-[0-1]\d-[0-3]\dT[0-2]\d(?::[0-6]\d){2}Z$/) !== NO_RESULTS;

exports.isObject = (value) => {
    const valueType = typeof value;
    if(valueType === "object") {
        return Buffer.isBuffer(value) || value instanceof stream.Readable;
    }
    return valueType === "string";
};

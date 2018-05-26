"use strict";

const NO_RESULTS = -1;

exports.isISOTimestamp = (value) => value.search(/^\d{4}-[0-1]\d-[0-3]\dT[0-2]\d(?::[0-6]\d){2}Z$/) !== NO_RESULTS;

exports.isObject = (value) => {
    const valueType = typeof value;
    return valueType === "string" || (valueType === "object" && value !== null);
};

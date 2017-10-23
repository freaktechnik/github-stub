"use strict";

const LAST_ELEMENT = 1,
    NO_RESULTS = -1;

exports.toCamelCase = (input) => input.toLowerCase().replace(/(?:\s|-)./g, (match) => match[match.length - LAST_ELEMENT].toUpperCase());

exports.toKebabCase = (input) => input.replace(/(\w)([A-Z])/g, (match, letter, upper) => `${letter}-${upper}`).toLowerCase();

exports.isISOTimestamp = (value) => value.search(/^\d{4}(?:-\d{2}){2}T(?:\d{2}:){2}\d{2}Z$/) === NO_RESULTS;

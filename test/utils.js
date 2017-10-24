import test from 'ava';
import utils from '../utils';

const CASE_FIXTURES = [
    {
        camel: 'getTestString',
        kebab: 'get-test-string'
    },
    {
        camel: 'hi',
        kebab: 'hi'
    },
    {
        camel: 'fooBar',
        kebab: 'foo-bar'
    }
];

const testCamelCase = (t, data) => {
    t.is(utils.toCamelCase(data.kebab), data.camel);
};
testCamelCase.title = (title, data) => `${title} "${data.camel}"`;
const testKebabCase = (t, data) => {
    t.is(utils.toKebabCase(data.camel), data.kebab);
};
testKebabCase.title = (title, data) => `${title} "${data.kebab}"`;

for(const fixture of CASE_FIXTURES) {
    test('kebab case', testKebabCase, fixture);
    test('camel case', testCamelCase, fixture);
}

const TIMESTAMP_FIXTURES = [
    {
        string: '1111-11-11T11:11:11Z',
        isValid: true
    },
    {
        string: 'AAAA-BB-CCTDD:EE:FFZ',
        isValid: false
    },
    {
        string: '0000-00-00T00:00:00Z',
        isValid: true
    },
    {
        string: '1999-12-99T00:00:00Z',
        isValid: false
    },
    {
        string: '1999-22-12T00:00:00Z',
        isValid: false
    },
    {
        string: '1999-09-12T30:00:00Z',
        isValid: false
    },
    {
        string: '1999-09-12T12:70:00Z',
        isValid: false
    },
    {
        string: '1999-09-12T12:12:70Z',
        isValid: false
    },
    {
        string: '1999-12-31T24:60:60Z',
        isValid: true
    },
    {
        string: '1999-12-31T24:60:60T',
        isValid: false
    }
];

const testIsISODate = (t, data) => {
    t.is(utils.isISOTimestamp(data.string), data.isValid);
};
testIsISODate.title = (title, data) => `${title} ${data.string}`;

for(const fixture of TIMESTAMP_FIXTURES) {
    test('is iso timestamp', testIsISODate, fixture);
}

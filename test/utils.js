import test from 'ava';
import utils from '../utils';

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

const VALID_OBJECTS = [
    "Object",
    Buffer.from("Object"),
    process.stdin,
    {}
];
const testValidObjects = (t, object) => {
    t.true(utils.isObject(object));
};
testValidObjects.title = (title, object) => `${object.toString()} ${typeof object} ${title}`;

for(const fixture of VALID_OBJECTS) {
    test('is valid object', testValidObjects, fixture);
}

const INVALID_OBJECTS = [
    1,
    true,
    null,
    undefined,
    function() {
        // only used for type check.
    }
];
const testInvalidObjects = (t, object) => {
    t.false(utils.isObject(object));
};
testInvalidObjects.title = (title, object) => `${typeof object} ${title}`;

for(const fixture of INVALID_OBJECTS) {
    test('is not valid object', testInvalidObjects, fixture);
}

import test from "ava";
import * as verify from "../verify";

test('json parse error', (t) => {
    const string = "foo";
    verify.type("test", string, "json", {
        "test": {
            "type": "json"
        }
    }, (a, m) => {
        if(m == 'Can not parse JSON') {
            t.false(a, m);
        }
        else {
            t.true(a, m);
        }
    });
});

test('argSpec null value not allowed', (t) => {
    verify.argSpec("test", null, {
        test: {
            type: "string"
        }
    }, (a, m) => {
        t.false(a, m);
    });
});

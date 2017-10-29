# github-stub
[![Build Status](https://travis-ci.org/freaktechnik/github-stub.svg?branch=master)](https://travis-ci.org/freaktechnik/github-stub) [![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/github-stub.svg)](https://greenkeeper.io/) [![codecov](https://codecov.io/gh/freaktechnik/github-stub/branch/master/graph/badge.svg)](https://codecov.io/gh/freaktechnik/github-stub)

Exports a sinon stub version of the node github client. It also exposes a function
to check the stubs were called with valid parameters.

## argumentsValid
Every stub has an additional method called `argumentsValid`. It takes an assertion
function as first parameter. The assertion callback should take a truthy value
as first parameter and a message as second parameter. The second parameter is
an optional sinon spy call to assess.

There is a method on the top level client object with the same name and signature
that will call `argumentsValid` on every API method that was called.

## allArgumentsValid
Same as `argumentsValid` but for every call of the stub.

This is also available on the top level client object.

## reset
The top level client object has a `reset` method that calls `reset` on every stub
it contains.

## License
This package is licensed under the MIT license.

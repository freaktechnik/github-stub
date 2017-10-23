# github-stub

Exports a sinon stub version of the node github client. It also exposes a function
to check the stubs were called with valid parameters.

## argumentsValid
Every stub has an additional method called `argumentsValid`. It takes an assertion
function as first parameter. The assertion callback should take a truthy value
as first parameter and a message as second parameter.

## License
This package is licensed under the MPL license.

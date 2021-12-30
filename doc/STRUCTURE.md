# Project Structure
## mapper
The actual embeddable mapper component lives here.
This component can be used with various backends, such as Electron (local files) or a web server like Flask (API calls back to a shared database).

## src/electron
The desktop app, build on Electron.
Serves the mapper component wrapped in a desktop app UI with a local file storage backend.

## src/flask
An example web server, for testing the mapping tool in a remote context.
Serves the mapper component wrapped in a web UI with an API/web server database backend.

## test
[Mocha](https://mochajs.org/) test cases.

## test_datasets
Database generators to create test-case maps.
May include methods to generate maps programatically for test purposes, map files, SQL dumps, etc.

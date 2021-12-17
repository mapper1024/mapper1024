# Mapping Tool
Under rapid development.
See [JOURNAL.md](JOURNAL.md) for information on development decisions.
See [REQUIREMENTS.md](REQUIREMENTS.md) for information on feature requirements.

## Release Downloads
The [current release](https://github.com/mapper1024/mapper1024/releases/latest) is built for all supported platforms.

## Project Structure
### mapper
The actual embeddable mapper component lives here.
This component can be used with various backends, such as Electron (local files) or a web server like Flask (API calls back to a shared database).

### src/electron
The desktop app, build on Electron.
Serves the mapper component wrapped in a desktop app UI with a local file storage backend.

### src/flask
An example web server, for testing the mapping tool in a remote context.
Serves the mapper component wrapped in a web UI with an API/web server database backend.

## Building & Running
### Electron (Local)
To run with Electron as a local desktop app, use the yarn commands:
```sh
yarn
yarn start
```

### Flask (Example server)
This tool can also be embedded in a remote server, an example flask app is provided:
```sh
pipenv sync
FLASK_ENV=development FLASK_APP=src.flask pipenv run flask run # Run server on 127.0.0.1:5000
```

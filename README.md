# [Mapping Tool](https://mapper1024.github.io)
Under rapid development.

## Release Downloads
See [DOWNLOAD.md](DOWNLOAD.md) for download information.

## Documentation
* [https://mapper1024.github.io/jsdoc](https://mapper1024.github.io/jsdoc): auto-generated API documentation
* [doc/JOURNAL.md](doc/JOURNAL.md): development process and decisions journal
* [doc/REQUIREMENTS.md](doc/REQUIREMENTS.md): specified feature requirements
* [doc/STRUCTURE.md](doc/STRUCTURE.md): map of the project's directories

## Usage
### Desktop App
The mapping tool can be run as an Electron desktop app; the mapping component and backends are all bundled in the Electron app.

### Web App
Alternatively, the mapping component can be embedded in any other web app. The mapper component library is bundled into a single javascript module file with each release.

#### Live Demo
A live demo is available at [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo).

## Building & Running
### Electron (Local)
To run with Electron as a local desktop app, use the yarn commands:
```sh
yarn
yarn electron-rebuild
yarn start
```

### Flask (Example server)
This tool can also be embedded in a remote server, an example flask app is provided that currently serves the live demo:
```sh
pipenv sync
FLASK_ENV=development FLASK_APP=src.flask pipenv run flask run # Run server on 127.0.0.1:5000
```

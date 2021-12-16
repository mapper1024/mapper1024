# Mapping Tool
Under rapid development

## (Dev) Running
### Electron (Local)
To run with Electron as a local desktop app, use the npm commands:
```sh
npm install
npm start
```

### Flask (Example server)
This tool can also be embedded in a remote server, an example flask app is provided:
```sh
pipenv sync
FLASK_ENV=development FLASK_APP=src.flask pipenv run flask run # Run server on 127.0.0.1:5000
```

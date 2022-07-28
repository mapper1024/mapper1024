# Project Structure
## dist
Distribution files such as compiled releases. Auto-generated.

## doc
Documentation regarding the project. Not auto-generated.

## jsdoc
API documentation for the mapper component. Auto-generated. See [https://mapper1024.github.io/jsdoc](https://mapper1024.github.io/jsdoc).

## mapper
The actual embeddable mapper component lives here.
This component can be used with various backends, such as Electron (local files) or a web server like Flask (API calls back to a shared database).

### actions
Various actions that can be taken on the map such as changing the name of a place or adding a new node.
Each action, once taken, generates an opposite action that is then used in the undo stack.

### backend
The generic backend and entity references, as well as the simple [sql.js](https://sql.js.org) backend implementation that works anywhere.

### brushes
The various brushes the user can use to manipulate the map, such as the add brush or the select brush.
Each brush has different effects, displays, and uses.
Brushes may specify what drag event occurs when the mouse is pressed, as well as what action occurs during the event.

### drag_events
Events that occur when the user drags the mouse. Some include the pan event, for navigating around the map, and the draw event, for adding new parts to the map.

## samples
Sample map files for demonstration purposes.

## src/electron
The desktop app, build on Electron.
Serves the mapper component wrapped in a desktop app UI with a local file storage backend based on SQLite.

## src/flask
An example web server, for testing the mapping tool in a remote context.
Serves the mapper component wrapped in a web UI with an API/web server database backend.

## test
[Mocha](https://mochajs.org/) test cases.

## tools
Scripts and other tools used to aid development and deployment.

# Prototype: 2021-12
## Codename
"Mapper1024" is the codename used during development before an actual name is chosen. This may be used internally in the future, or replaced with the user-facing name is updated. Ideally this will occur soon after the prototyping phase.

## Mapper Component
The mapper is implemented as Javascript modules and classes; this is the simplest choice for a web component.
The mapper is split into two parts: the frontend Mapper, which is the UI, and the pluggable backend MapBackend instances which are defined by whatever is embedding the Mapper, which are the database access logic.

## Electron
Electron is a default choice for making web-based desktop apps.

## Flask
In order to test the other server-backed setup, a simple prototype program using this setup was needed.
I chose the Flask framework because Python is flexible and I can easily serve the mapper component and write any backend APIs needed to support the component on the server.

## Release Infrastructure
Scripts have been added in the `tools` directory to update the version number throughout the project and push a new git tag based on the version number.
A new tag indicates a new version of the program is ready for users; versioning is [Semantic](https://semver.org/).

### Desktop App
Using [electron-builder](https://www.electron.build/) and Github Actions, every time a new tag is pushed to Github, the electron app is built for Linux (AppImage, zip) and Windows (NSIS installer, portable EXE). These files are uploaded to a new Github release for that version tag. More platforms and options will be added in the future, including MacOS support, Windows Store support, and Linux package manager support.

### Web App Library
The mapper library is packed into one file using [rollup.js](https://rollupjs.org) and uploaded to each Github release along with the desktop app. This library can then be included in any Javascript and extended with the appropriate backends to be used as an embedded map editor component.

## Node & Edge Architecture
The node and edge architecture is an `"Entity-Based [Model]..." (Rigaux et al., p. 31)` where nodes contain the map object's `"description and... spatial component" (p. 31)`. The edges are only part of the prototype design for now, with the intent to use them as a cache of node relationships. Further study will be required.

# Functional Prototype: Summer 2022
Over the course of Summer 2022 the mapping tool has developed to the point of being functional, albiet with a limited set of options.

## Geometry
Geometry is represented in 3D space with a custom [Vector3](https://mapper1024.github.io/jsdoc/Vector3.html) class to represent points and offsets in space and supporting [Line3](https://mapper1024.github.io/jsdoc/Line3.html) and [Box3](https://mapper1024.github.io/jsdoc/Box3.html) classes for lines and boxes.

## Spatial Nodes
The map itself is still represented with a set of nodes: each node being an object in the map such as a forest, a lake, or a river. The nodes have shape and size currently defined by their children. Nodes are technically positioned in 3D space with pseudo-spherical shape, but currently the Z axis is unused so the nodes are effectively pseudo-circles on a 2D plane. The position and shape of each node is then used to determine how the entire map is rendered.

## Backend
The map backend is where the nodes and map settings are stored and retrieved from. The backends are intended to be swappable, e.g. the mapper component could be used with a backend that loads and saves from a local file (like the SQLite backend) or from a remote server (yet to be implemented). Unit tests have been set up for all existing map backends.

Currently there is a fully functional SQLite map backend, for the desktop app, and a [sql.js](https://sql.js.org) backend that does not support loading or saving and is used for the live demo.

### Caching
Because accessing a database may be relatively slow (testing revealed that the WASM-compiled sql.js backend was noticeably slower than the native SQLite backend), the backend implements a cache for each entity. The entities' properties and parent-child relationships are cached in memory so they must only be loaded from the database once. Since writes to entities occur far less frequently than reads, the cache is write-through: changing a property or relationship will immediately change it in the database as well as in the cache.

## Interface
The user interface is programmer art; it is not very pretty. It provides quickstart information and information about the scale of the map, what brush is being used, and hotkey options. The primary control is the mouse for drawing, deleting, selecting, and moving, with the keyboard being used to select options.

### Tile Rendering
The map itself is rendered with the use of tiles. The map is not tile-based internally, that would not be flexible enough, but the renderer takes the map information about what objects are where and renders them to the screen as a set of tiles.
In the current implementation, each tile has a primary "type" which is what kind of node it is closest to, and it has information on what the primary "types" of the nearby tiles are as well. The tile uses this information to generate an image representing that location on the map. The neighbor information is used to render transition images, e.g. where water turns into grassland there is a transition like a "beach". The rendered tiles are cached, so identical tiles only need to be rendered once.

## Electron App
The electron app supports saving, loading, and editing maps. It stores each map in a SQLite database that is saved to the file system.
This is the "primary" way to use the mapping tool for the forseeable future, as it is the most performant and allows for the use of native SQLite as opposed to WASM-compiled SQLite or remote databases.

## Live Demo
For users who cannot use the electron app (MacOS doesn't have a build yet, for example) or don't want to bother, a live demo is provided at [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo). This has the full mapper component, but does not yet support loading or saving maps.

Testing has revealed that Google Chrome has much better performance than Firefox for the mapping tool, so further optimization will be needed.

## Sample Map
A sample map is provided and loaded by default with the desktop app and live demo to show what the tool is currently capable of. This sample map was designed on the fly, but has a tiny bit of storytelling attached to make it interesting. It is expected that testers will be able to play with the sample map which will be updated in the future as new features are added.

# References
* Rigaux, P., Scholl, M., & Voisard, A. (2001). *Spatial databases with application to GIS*. Morgan Kaufmann.

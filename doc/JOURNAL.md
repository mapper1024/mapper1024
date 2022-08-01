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

### Units
Three sets of units are used when rendering, editing, and storing the map: *meters*, *map units*, and *pixels*. In the backend database, nodes are stored with position and shape in *map units*, which are an arbitrary unit of distance. *Map units* are directly proportional to *meters*, allowing for maps to relate to real-world distances. The relationship between *map units* and *meters* is currently 1 *unit* = 2 *meters*, but this may change depending on program needs, map size, or other options. In the frontend, a *map unit* corresponds to a certain number of *pixels* on screen, depending on zoom level. This determines how large objects appear on the screen.

## Backend
The map backend is where the nodes and map settings are stored and retrieved from. The backends are intended to be swappable, e.g. the mapper component could be used with a backend that loads and saves from a local file (like the SQLite backend) or from a remote server (yet to be implemented). Unit tests have been set up for all existing map backends.

Currently there is a fully functional SQLite map backend, for the desktop app, and a [sql.js](https://sql.js.org) backend used for the live demo.

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
For users who cannot use the electron app (MacOS doesn't have a build yet, for example) or don't want to bother, a live demo is provided at [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo). This has the full mapper component, and supports saving and loading maps through the browser.

Testing has revealed that Google Chrome has much better performance than Firefox for the mapping tool, so further optimization will be needed. (Curiously, the most performant platform for the *entire program* was Microsoft Edge on Windows, outperforming Google Chrome and even Electron itself. I have not explored this scientifically, so it's just an interesting anecdote.)

## Sample Map
A sample map is provided and loaded by default with the desktop app and live demo to show what the tool is currently capable of. This sample map was designed on the fly, but has a tiny bit of storytelling attached to make it interesting. It is expected that testers will be able to play with the sample map which will be updated in the future as new features are added.

## Decision: How to Shape Nodes
Currently, an individual node has a circular shape defined by a radius. This is for ease of implementation. Ideally, an individual node would have an arbitrary shape. This is simulated by allowing nodes to have *children*, which means a set of circular nodes of varying sizes can be used to craft a *parent* node of whatever shape the user wants. More complicated or exact shape design may be introduced, but I wanted to keep drawing nodes as simple as possible so the user can get straight to placing objects on the map.

## Decision: How to Render Nodes
Because the program must render the map to a screen of pixels via algorithm (the user should not be concerned with placing individual pixels, this is not a drawing tool), I chose a tile-based approach for rendering. It's important to distinguish this program from a tile-based map editor like [Tiled](https://www.mapeditor.org/) because the underlying representation in the database is *not* tile-based, neither should the user edit the map in terms of tiles. The mapping tool takes the object/node-based map the user makes and decides algorithmically how each object should be displayed on screen, using a grid of (currently 16x16) tiles. The algorithm (see `mapper/tile.js`) decides how each tile should look depending on which node is being displayed at a certain point, how the node looks at that point, and takes into account nearby nodes so the map flows between types of terrain and map features.

The prototype algorithm just randomly generates appropriate pixel art with some transitions at borders and produces recognizable--if rough--results. Future algorithms, or *renderers*, will use a combination of procedural generated and pre-made art to represent the underlying nodes. Renderers will be swappable, so you might render the same map in the a Tolkien-esque style and then again in the style of a government survey. The renderers will read the map data and decide to, e.g., draw a road node through a forest as a dirt-colored line following the path the user set with overlapping images of trees at regular interfaces to represent the surrounding forest node.

## Performance
I've cut down on the slowest parts of the code by using Chromium's performance profiling feature and introducing caching or changing the algorithms I use. Rendering the map as tiles is still quite slow, and the ad-hoc approach to redrawing the screen produces some "glitchy" rendering when panning the map or zooming in or out. Future optimization will focus on making the program feel smoother, which is important to the user experience.

# References
* Rigaux, P., Scholl, M., & Voisard, A. (2001). *Spatial databases with application to GIS*. Morgan Kaufmann.

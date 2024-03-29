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

# Database Evolution: Early 2022-09
## Node Shapes
In the database, nodes now have a type which can be "object" or "point". "object" nodes correspond to map objects like a forest, a wall, a rock, or a mountain. Individual "object" nodes now have an arbitrary shape defined by a set of connected "point" nodes.

## Defining terms
* Node: An object in the database that is any spatial entitity.
* \[Map\] Object: A node that corresponds to a "real" map object like a tree or a forest or a mountain. Has "point" nodes as children to define its area.
* \[Map\] Point: A node that defines a map object's spatial area/region. Has an "object" node as a parent.
 * Points are connected by edges to determine what space is the "inside" of an "object" node.

## Step-by-step walkthrough: How a piece of the map is made
1. The user clicks, strokes the drawing brush across the screen to draw a body of water, and releases.
	1. At the initial click, an "object" node representing the body of water is created.
	2. Four equidistant "point" nodes are made as children of the "object" node to show the boundaries of the first click.
	3. As the user drags, the rotation of the brush---that is, how the angle of the stroke changes as the user moves the brush---is used to add more "point" nodes on each side of the stroke. These points are added only after the brush has traveled long enough for new points to be needed to add more area to the "object" node to keep up with the brush.
	4. The most recently added points are connected to the previously added points by edges.
	5. The most recently added points average position with their connected neighbors is determined and stored.
	6. All added nodes are recorded for updating in the next render step.
	7. The process repeats for the next step of the brush.
2. After the user releases the brush, points that sufficiently overlap are merged to simplify the graph.
3. The renderer updates based on the newly added nodes, using the recorded average positions and brush size radii to display the nodes.

## Decision: Algorithm to determine borders from brush strokes
All the information on where the borders of a brush stroke already existed--the position of the brush and the size of the brush--so I just had to convert these into a point-and-edge representation. The border needs to rotate with the brush stroke (e.g. if the user is drawing horizontally, the border will run on the top and bottom of the brush, but if the user is drawing vertically, the border will run on either side) so I keep track of the difference of brush position and calculate the angle to continue the border path at. Edges are used to connect the border, and are also used inside the border to show which side of the border is the inside of the object and which (if any) is outside.

## Decision: Database versions & upgrades
This database evolution is incompatible with previous versions. I added database version numbers to make this explicit to users if they attempt to load an older database. Automatic upgrading would be possible, but because this is such an early prototype and no promises of backwards-compatability have been made I decided to forgo the effort. Future versions will have automatic upgrades/backwards-compatability.

## Altitude
Altitude (Z-levels) has been added so that when something is drawn on top of something else, it renders as the user expects. Previously, smaller objects would always render over larger objects. Different parts of objects can have different altitudes; objects are defined with 3D space. The UI for altitude control will be greatly improved in the future, currently if an object is drawn on top of another its altitude in that area is simply increased by 5 meters.

# Practicum Reflection Journal through 2022-09-12
Preparing for practicum work, I distilled existing documentation into a Project Proposal and a Formal Requirements document. Nothing of much note occurred here; I was able to translate documentation fairly straightforwardly into the more structured form. Time taken was as expected; a few hours of writing documentation.

Future reflection journals will include more details about implementation; Practicum work began over the past week, following my first organizing meeting.

# Practicum Reflection Journal through 2022-09-25
The bulk of this period involved expanding the formal requirements document and building system models. This proceeded as expected; I knew writing the requirements and designing the models would take longer than I might instinctively think. Meeting with Dr. Kasper and Dr. Robbeloth helped to clear up any questions I had about to proceed.

Development remains on track. The biggest programming change was adding database upgrade infrastructure and moving edges to a new storage schema for a more understandable diagram. I also added a unit test for binary compatability between the two SQLite map backends; the need for this test manifested as I was working on upgrading both backends' schemas simultaneously.

# Through 2022-10-09
This development period involved adding additional layers (Political and Annotation). This was accomplished by adding a "layer" property to nodes that stored a layer ID to identify which layer the node belonged to. The database schema did not need to be altered since additional properties are supported automatically, saving a migration. Layers are currently defined in a generic layer registry class with the three hardcoded layer types: Geographical (the previously existing layer representing physical terrain), Political ("imaginary" parts of the world like political borders), and Annotation ("out-of-world" notes or sketches). In the future, map backends may provide their own layer registries for additional layers, but due to the logic needed to display the different layers in different ways these three are the only currently supported layers.

Planning continues for the next release; the requirements documentation has been refined to be more explicit, and a survey is being designed for the next release to gather user sentiment about the various features.

The next feature in development is explicit objects, such as a single tree. These objects are generally on a much smaller scale than the existing terrain.

Layers and explicit objects both will be in prototype stage--although usable. Later, when the UI and renderer are reworked, they will be fully realized, but all the core features need to be in place to begin the renderer rework.

# Through 2022-10-23
I experieced difficulty implementing deeper zoom resulting from trying to map 3D nodes to 2D canvas, so I had to explicitly discard the Z coordinate in some cases. This was part of the difficulty of adding explicit objects at a very small scale, so adding explicit objects has also helped work out zooming/scaling bugs.

I added explicit objects represented with additional node types (e.g. forest vs tree, rocks vs stone, buildings vs tower).

## Explicit Paths
I worked on adding explicit paths. Paths area represented as child nodes of type "path" which are connected by edges. Specific node types may be paths, which are displayed currently as lines on the map. Two path objects are present: the Road terrain now has paths associated with it, as well as a new political terrain called "Route" which has no area but only a line/path.

## Distance Measurement
Distance measurement has been added through two new brushes to place two "pegs". The distance between the pegs (in meters and kilometers) is displayed to the user when the peg brushes are selected. Future developments will use a more modal structure for distance measurement, and possibly add path editing.

I continued work on the user survey and preparing for the release, which comes very soon.

# Through 2022-11-6
I finished release documentation and the user survey and deployed 0.3 to my testers.

## Renderer Design

Map objects roughly correspond to "features" (Neupane, 2017).

There are two basic cases we need to consider on the map: an area that is solely one map object type, or an area between two map objects---a border.

### Information Input
The information remains the same between the old and new renderers.

* "Mesh" of points and edges to indicate area/volume of each object.
* Each map object consists of a set of interconnected sub objects representing various pieces of the whole.

### Intermediate Representation

#### Old Renderer
* Map split into tiles, where each tile was a 16x16 pixel area corresponding to the map object whose area was, on average, on top (highest Z level) at that particular location.

#### New Renderer (Design Draft 1)

* A set of map (sub)objects to be rendered.
* A set of border areas that require special handling during rendering.
  * The set of border areas consists of areas where map images need to overlap.
  * Each individual border area may be a tile of appropriate size, perhaps 16x16.

### Rendering Process

#### Old Renderer
* Each tile is rendered on screen as a particular set of random colors corresponding to its dominant node type. Borders are generated based on what tiles (with what dominant nodes) are next to a given tile.

#### New Renderer (Design Draft 1)
* Each map sub object has an image generated for it based either on an algorithm or on pre-defined image files. The image is the size and shape of the map object at the appropriate scale; it will be tiled and/or masked out to force a rectangular image into the full size and an irregular form. This image may be cached until the size or shape of the map object changes.
* Images are constructed to tile appropriately, such that terrain of the same type will line up on a global coordinate grid.
* Explicit objects may be scaled single images rather than tiling terrain.
* Map objects will be cached in a large tile system, perhaps 256x256 tiles or similar.
  * A tile may contain only part of a rendered image. Only the necessary part of the rendered image will be saved in the cached large tile and rendered in that large tile.
* Border images are necessary when one map object needs to be rendered beside (or within and on top of) another map object.
* Border images are generated to align with the tiles of all objects involved in the border. The map object on top takes precedence, with the side(s) of the border image facing away from the most precedent map object being rendered as transitions to the other map objects.
  * Transitions may be automatically generated and cached, or provided as premade image tiles.
* (Future) Rendering may be parallelized---each large tile should be independent of the others.
* (Curiosity) Hexagonal tiles? More options for borders, best at filling space.

## Implementing the Render
I began to implement the renderer. I tore out all of the old renderer relating to rendering as tiles and began implementation of each node that needed to be drawn having a "NodeRender" object associated (and cached) for it. This NodeRender object will abstract actually rendering each individual node and calculating border areas for the various sizes, and the primary renderer will piece all of these objects together appropriately.

# Through 2022-11-20
I initially implemented the renderer in two pieces: rendering each object separately, and then rendering the pre-rendered objects onto the screen. This required a significant amount of memory when fully zoomed in, and also required rendering the entire object for each object displayed, even if it was not on screen. This approach also required searching the entire map to detect what nodes were rendered at what points.

I implemented megatiles, which split the rendered map up into 512x512 chunks. Objects are rendered in pieces over each of these chunks, allowing for only the chunks that need to be displayed on the screen to be rendered. Megatiles also retain information about what parts of which objects are rendered within them, enabling faster detection of what objects are displayed at any given point on the canvas---this is useful for determining what object the user is pointing at.

During development I ran into an issue where objects rendered to canvases that were too large. To solve this issue, I limited each individual canvas size to 2048x2048, and the cached node renders consist of however many of these canvases are needed to contain the entire image. Each smaller canvas is rendered only on demand, making for a much faster map loading and navigating experience.

Immediate future development will reach feature parity with the old renderer.

# Through 2022-12-04
This is the final development period for the Fall 2022 semester.

I implemented a prototype for transitions generated based on focus/border tiles between nodes.

I developed an idea that the primary representation for objects should be their foreground images---such as trees for the forest, or blades of grass for the grass/plains---and the background color should be secondary. This separation of foreground and background will enable much smoother transitions, as well as more Tolkien-style rendering where the background color is quite similar across terrain types; terrain there is only identified by its foreground images.

Over the next development period---Winter break---I intend to bring the new renderer up to feature parity with the old renderer, and release a new version for testers to evaluate.

# Through 2023-01-12
I implemented the new renderer. I used public domain graphics from Openclipart for explicit objects, temporarily.

# Through 2023-01-22
After the new renderer completed the major mapping functionality, the interface was next on the list to be revamped. Version 0.5, released to the testing group on January 21 2023, included a redesigned user interface with a full palette sidebar with every control clickable. The (now huge) blob of help text omnipresent in the top left corner was gone in this version, replaced with tooltips on the controls in the sidebar palette indicating what each control did and what its keyboard shortcut was. Now every part of the tool could be operated with the mouse too rather than only the keyboard—satisfying a major piece of feedback given by the testing group throughout development. Version 0.5 was released quickly in order to gather feedback through the survey and interaction with the testing group so that the user interface could be rapidly tweaked further to fit user expectations.

The development of the user interface was fairly smooth; there was quite a bit of trial and error in the UI appearance but mostly it was just porting the keyboard controls over to the palette sidebar and adding help text. I am satisfied with how well the process went, and users are enjoying the improved UI.

# Through 2023-02-05

Much of this development period was used writing the draft of the Honors Project report, detailing the research, development, and results of this project. Writing the project report summarized the development journal, development history, changelog, and project documentation.

Releases 0.5.1-0.5.3 were written during this time, adding explicit extend/merge functionality and area calculation. These additional fixes and features are incremental improvements looking toward the 0.6 stable release.

Extend/merge functionality is conceptually simple, a new brush was added for extend with exactly the same behavior as the old add brush, except it only works to add on to existing objects. The old add brush now does not have that behavior. The merge functionality, to allow two objects of the same type to be merged together, works by changing the parent of all selected objects' children to be only one of the selected objects (the first one selected) and then deleting the remaining, now childless, parents.

Calculating the area is also simple; it is implemented within an "Area Brush" that stores the brush strokes as a set of 16x16 pixel tiles that have been brushed over. These tiles can then be counted, and a rough area in square kilometers calculated and displayed to the user. This will be useful for determining, e.g., how big a kingdom is. The area brush is tied into the undo/redo system, but its actions are purged from the undo/redo stack whenever it is reset to avoid unexpected area calculation actions.

# Through 2023-02-19

In this development period, I implemented multi-tile terrain textures. This allowed for multiple 16x16 tiles for each terrain type, which then were randomly combined into a larger texture to provide for more variance when displaying terrain. I added additional textures for all the terrains to use this new feature.

With the remaining time in the development period, I worked on performance optimization. I realized through performance analysis that much render time was being taken in rendering focus tiles that aren't really necessary to understand the map, so I also implemented a significant performance boost: focus tiles no longer update during activity (i.e. panning the map or drawing on the map). This still displays all relevant information, but as the map is panned or drawn on the focus tiles do not display until the action is complete. This makes the user interface much snappier.

# Through 2023-03-12

I put some development toward refactoring the action system to support custom keybinds in the future, but managing keyboard input in a generic way is difficult using vanilla Javascript. I decided to postpone this until after the project development period.

I implemented image exporting, a valuable feature so that maps can be used as illustrations or images outside of the tool itself. It works fairly straightforwardly, by opening a modal copy of the rendered map with a special brush used to select an area. Once the area is selected, the user can choose to export it, which loads another copy of the rendered map without any UI elements, navigates to the selected area at the selected zoom level, and exports the rendered canvas to a PNG image which is then downloaded by the browser.

Version 0.6.1 was released with image exporting and some small user interface improvements: making the undo and redo buttons more readable and making distance calculation appear in the brushbar.

# Through 2023-03-26

I put time toward the Honors project report and preparing to present this project at SURC on April 5th.

I also filled out more unit tests for the glue of the program---pieces such as the Line3 class and utility functions. I began the test plan document, which will describe unit tests as well as scripted tests to ensure each requirement is correctly fulfilled.

# Through 2023-04-09: sURC presentation

I developed presentation slides for [sURC](https://www.mvnu.edu/undergraduate/academics/honorsprogram/surc) to show off the project. I had originally planned to live demo the software, but the 15 minute presentation time as well as difficulty of loading up software for demonstration led me to use animated gifs of the project instead of a live demo, which was actually the [most technically involved part](https://benleskey.com/blog/mapper_gifs) of the presentation requiring me to record a suitable video, convert it to a gif, and compress it lossily so it would fit well into the presentation.

On April 5th presented the project at sURC, with my presentation and the project winning the top prize.

# Through 2023-04-23

All outstanding feedback came in for the Honors project report, and I made the necessary revisions and submitted the final report to the Honors program.

I also unlocked map scaling. Previously, the zoom was capped at zoom level 30, meaning that a 1920x1080 screen could display at most 80 kilometers diagonally, which was not nearly enough for larger worlds. Now zoom is unlimited, with number inputs to manually specify any zoom to be desired in addition to zoom scrolling. Kilometers per screen diagonal was chosen as a platform independent way to represent the zoom scale, along with the standard, if less intuitive, zoom level.

I wrote a quick start guide for the mapping tool, providing basic usage and installation instructions. This serves as documentation along with the tooltips and help inside the tool itself.

# Through 2023-04-30

I performed the entire [test suite](https://github.com/mapper1024/mapper1024/wiki/Test-Plan), including automated unit tests and scripted tests, with version 0.6.2 of the program. All tests passed.

# References
* Neupane, S. (2017). *Storing and Rendering Geospatial Data in Mobile Applications*. https://scholarworks.uno.edu/honors_theses/90
* Rigaux, P., Scholl, M., & Voisard, A. (2001). *Spatial databases with application to GIS*. Morgan Kaufmann.

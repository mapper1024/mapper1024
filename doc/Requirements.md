# Mapping Tool
* Benjamin Leskey
* Mount Vernon Nazarene University
* 2022-09-23

## Introduction

### System Overview
The mapping tool software is for lay users such as authors, storytellers, and role-playing gamers to create maps for their worlds or fictional environments. It is intended for use as desktop software or a web app in a desktop environment; as well as being used as an embedded component in other web apps.

### Human Resources
As part of the Honors division of this project, a group of testers should receive incremental releases to give feedback on as major milestones are developed: the software is developed for myself, them, and anyone else who may find the tool useful.

## User Requirements (written for customers, may need user stories and/or use case diagrams)

### User Objectives
The mapping tool software MUST allow users (e.g. authors or other storytellers) to create custom (e.g. fictional) maps for their worlds or environments. These maps may be used to organize world-building, create book illustrations, or showcase a story, to list a few possibilities.

The mapping tool MUST allow users to draw maps at a higher level than simply placing pre-made props or drawing pixels. Users can place map objects like a river, a forest, a castle, or an island with specified dimensions without concerning themselves about how specifically the object should look on the screen. The software MUST provide controls so that the user can edit the map and objects on the map in real dimensions (e.g. meters).

The mapping tool SHOULD allow users to render/print their maps to images in pretty format suitable as an illustration or display of a fictional world.

Basic help information MUST be included, interactive help SHOULD be provided, and a tutorial is a WISH-LIST item.

The primary use of the mapping tool is as desktop software (either running locally or in a browser) where the user uses the mouse and keyboard to create and edit their maps, which are saved as files. Mobile support is a WISH-LIST feature.
The mapping tool SHOULD be useable as a component in a web app, where the backend that stores the map data is defined by the surrounding system allowing for, e.g., remote storage or collaborative editing.
The mapping tool SHOULD support pluggable renderer components, so that the same map may be rendered in different styles (e.g. like a Tolkien map, or like a geographical survey). A default fallback renderer with simple image generation MUST be developed to support the minimal feature set. One renderer---in a generic, vaguely realistic style---SHOULD be included with the tool for core mapping functionality, but additional renderers are WISH-LIST features.

The mapping tool should be deployed as free and open source software, with an appropriate license. See [#42](https://github.com/mapper1024/mapper1024/issues/42).

### Similar System Information
The mapping tool is intended for use as a standalone desktop app, or as an in-browser desktop app. It should also be usable as an embedded component in other web apps, as it SHOULD provide an interface for loading custom UI interactions and custom map backends. The mapping UI and renderer is a separate component from the underlying database.

### User Characteristics
The user community consists of people with all levels of computer expertise; they should need no prior experience with, e.g., image-editing to be able to use the software.

## Functional or System Requirements

### The map must support multiple layers
To support various types of geography in the same map, such as real terrain and political borders in the same world, the map should support creation and editing on various "layers" or "types" of things.

These layers are:
* Geographical - The primary terrain/object layer
* Political - To show political boundaries: national territory, city limits, etc.
* Annotation - for "out-of-world" notes (e.g. to show where a particular story takes place, or where a particular event occurred)


* Issues: [#30](https://github.com/mapper1024/mapper1024/issues/30)
* Criticality: MEDIUM, users expect a differentiation between physical and political regions and objects.
* Dependencies: Map pieces with arbitrary shape and position

### The map must have a representation of explicit objects
Explicit---or, significant---objects are objects that are very well defined on the map, such as a single tree, a building, a particular tower, etc. They stand in contrast to map objects that represent mere areas of terrain like grass or rocks. The map must support these explicit objects and allow users to add them.

* Inputs: Designation as explicit object.
* Outputs: Rendering of the explicit object on the map.
* Issues: [#34](https://github.com/mapper1024/mapper1024/issues/34)
* Criticality: MEDIUM, users need a way to specify significant objects on their map, or objects that are not simply areas of terrain.

### The map must have a representation of explicit paths
Objects should be able to represent paths---such as a road, a trail, or a shipping route. These paths may then be used to determine distance or simply be rendered on screen.

* Issues: [#46](https://github.com/mapper1024/mapper1024/issues/46)
* Criticality: MEDIUM
* Dependencies: Explicit objects, multiple layers

### The mapping tool should support a variety of map object types
In order for a wide variety of maps to be supported, a broad number of generic terrain/map object types should be supported.

See [issue #51](https://github.com/mapper1024/mapper1024/issues/51) for a current list of required terrain and objects.

* Criticality: MEDIUM
* Dependencies: Explicit objects, multiple layers

### The map must look OK
The rendered map must be vaguely realistic and smooth so that users can understand what they are looking at and be comfortable editing their maps.

* Inputs: The map created by the user.
* Outputs: Algorithmically rendered graphics.
* Issues: [#31](https://github.com/mapper1024/mapper1024/issues/31)
* Risks: Failure to prioritize can result in getting bogged down messing with graphics. Performance of the algorithmic renderer must also be maintained.
* Dependencies: Algorithmic rendering, multiple layers, explicit nodes, paths
* Criticality: HIGH, users need things to look OK

### The user should be able to discover the distance between arbitrary points on the map
The user should be able to discover the distance between arbitrary points on the map.
Distance may be measured as the crow flies---direct distance, or following paths---such as roads or trails.

* Issues: [#35](https://github.com/mapper1024/mapper1024/issues/35)
* Inputs: User indication of (at least) two points.
* Outputs: Display of the distance between the indicated points.
* Dependencies: Explicit paths
* Criticality: LOW

### The software should provide help to users
Users need assistance with using the software beyond simple documentation. Help may be in the form of help text, interactive help, or even a tutorial.

* Issues: [#37](https://github.com/mapper1024/mapper1024/issues/37), [#36](https://github.com/mapper1024/mapper1024/issues/36)
* Outputs: An informative UI that response to user action.
* Risks: Help needs to be comprehensive and kept up to date with developments.
* Criticality: LOW

### Maps should be renderable in arbitrary styles
Maps should be able to be rendered in different styles (e.g. like a Tolkien map, or like a geographical survey). Renderers should be easily swappable.

* Issues: [#38](https://github.com/mapper1024/mapper1024/issues/38)
* Risks: Multiple renderers greatly increase complexity.
* Criticality: LOW

### The system should provide an easy way to load existing maps
Users should have a dashboard, landing page, recently opened, or some other kind of way to easily access their existing maps.

* Inputs: History of map editing.
* Outputs: Interactive display of existing maps.
* Issues: [#39](https://github.com/mapper1024/mapper1024/issues/39)
* Risks: Increases complexity with a new display; a new subsystem.
* Criticality: LOW

### The editor should support transfer operations
Users should have a way to easily transfer pieces or objects of their maps to other areas, perhaps through the cut/copy/paste paradigm. Ideally these pieces may transfer between maps as well.

* Inputs: Pieces of a map.
* Outputs: Duplicate map pieces.
* Issues: [#14](https://github.com/mapper1024/mapper1024/issues/14)
* Risks: Copying objects between maps may require additional subsystems for inter-process communication or OS clipboard methods.
* Criticality: LOW

### DONE: The mapping tool should let users create maps
The mapping tool should let users create and edit individual maps, that represent arbitrary terrain/geography useful for storytelling organization.

* Inputs: User input and control.
* Outputs: A "map" which is a representation of the designed map.
* Criticality: MUST-HAVE, this is what the tool is for.

### DONE: The mapping tool should let users edit maps at an arbitrary scale
The mapping tool should support editing maps at an arbitrary scale and level of detail.

* Criticality: MUST-HAVE, this is an important feature for detail and detail management in maps.
* Risks: Arbitrary detail risks performance issues; care and optimization must be taken when implementing this requirement.
* Dependencies: Map creation

### DONE: Maps must be persistent
The maps created by the mapping tool must be persistent so that users can access previously created maps.

* Inputs: Map created in the mapping tool.
* Outputs: Persistent store of the map that can be loaded again.
* Criticality: MUST-HAVE, this is a necessary feature for any editor program.
* Risks: Persistence implies a schema or format of some kind; care must be taken so that backwards compatibility is maintained.
* Dependencies: Map creation

### DONE: Pieces of the map must have arbitrary shape and position
Individual "pieces" of the map like a forest or a lake or a city must have an arbitrary, user-defined "real" (as in meters) shape and position.

* Inputs: User input and control over shape when drawing.
* Outputs: Pieces/objects in the map.
* Risks: Arbitrary shapes increases complexity of the map.
* Criticality: MUST-HAVE, for advanced map creation.
* Dependencies: Map creation

### DONE: The map must be rendered by algorithm
To avoid creating specific images for each configuration of terrain, the map graphics should be created or assembled algorithmically, with appropriate transitions and indicators.

* Inputs: The map created by the user.
* Outputs: Graphics rendered on the screen.
* Risks: Algorithms may be expensive
* Criticality: HIGH, users need a flexible map rendering system.

## Interface Requirements

### User Interfaces
The primary interface into the system that MUST exist is the map editing UI. This provides controls to edit existing maps and a display of the map in editing. An interface to export maps as image files SHOULD also exist. The primary interface MUST be supplanted with controls to create new maps, save maps, and otherwise manage multiple maps---the exact behavior depends on the platform and system the mapping tool is running on. Basic command-line options MUST be supported to load existing maps.

#### Map Editing UI
A representation of the map SHOULD be rendered onto the screen with editing controls. The user can zoom in and out of varying levels of detail and scale. The scale the map is being rendered at SHOULD be displayed on screen. The position of the cursor SHOULD correspond to a position in the map, which SHOULD be displayed to the user.

* The map editing UI SHOULD be menu/button based, with hotkeys to supplement common actions, see [#48](https://github.com/mapper1024/mapper1024/issues/48).
* Context menus (i.e. right click) SHOULD be supported on map objects for common actions, see [#28](https://github.com/mapper1024/mapper1024/issues/28).
* The zoom functionality SHOULD zoom toward the cursor, see [#32](https://github.com/mapper1024/mapper1024/issues/32).
* Long operations---like loading the map---should be indicated to the user, see [#20](https://github.com/mapper1024/mapper1024/issues/20).

### Hardware Interfaces
The mapping tool MUST interface with the mouse for drawing the map and selecting options, and SHOULD interface with the keyboard for faster editing. The mapping tool MUST support the "trackpad" model of mouse, for laptop users. The mapping tool may support touchscreen interfaces with gestures as a WISH-LIST feature.

### Communications Interfaces
N/A

### Software Interfaces
The mapping tool SHOULD provide APIs for:
* Embedding the mapping UI component (so that it can be embedded in other web apps).
* Plugging in map backend components (so that maps can be loaded from alternative databases, files, or other resources).
* Plugging in map renderer components (so that maps can be rendered in arbitrary styles).

APIs SHOULD be described in the automatically-generated documentation (https://mapper1024.github.io/jsdoc/).

## Non-functional Requirements (Other than those previously listed)

### Hardware Constraints
The mapping tool SHOULD run comfortably on any recent consumer laptop or netbook browser.

### Performance Requirements
The mapping tool SHOULD maintain at least 30 frames per second.

### System Environment Constraints
The desktop app is build using the [Electron](https://electronjs.org) framework. The desktop app uses a [SQLite](https://sqlite.org) database backend to store each map. The browser app uses a [sql.js.org](https://sql.js.org) SQLite database to store each map.

### Security Requirements
Updates to the mapping tool should be distributed through the existing Github system; users may install new updates as they come. Automatic updates are a WISH-LIST feature.

### Reliability
N/A

### Robustness
The system MUST fail early and explicitly when an error condition occurs, and SHOULD atomically save maps to avoid corruption.

### Availabilty
N/A

### Safety
The mapping tool MUST be as safe as an average image-editor. Possible loss of data may be avoided through automatic revision saving or other backups.

### Maintenance
The mapping tool SHOULD automatically deploy numbered version releases through Github CI. Download links SHOULD automatically point to the most recent numbered version release. The mapping tool SHOULD have comprehensive unit tests for as many subsystems as possible.

### Portability
The mapping tool MUST support Windows 10+, and Ubuntu 20.04+ or other similar Linux distribution. The mapping tool SHOULD support Mac OS 11+. The mapping tool might support Android and iOS as a WISH-LIST feature. The mapping tool MUST support the latest version of Google Chrome/Chromium (including Microsoft Edge), and SHOULD support the latest versions of Safari and Mozilla Firefox.

* Mac OS ports SHOULD use the Command key, see [#26](https://github.com/mapper1024/mapper1024/issues/26)

### Extensibility
The mapping tool SHOULD support importing maps from previous versions throughout the development process. The mapping tool MUST support importing maps from previous versions after the first major release to the public (v1.0). [#41](https://github.com/mapper1024/mapper1024/issues/41).

### Development Process Constraints
The development environment assumes a UNIX-like system for development scripts (such as for managing version numbers), but the program may be built and run using any platform supported by [Electron](https://electronjs.org). The desktop app development environment uses [Yarn](https://www.npmjs.com/package/yarn) to access [Electron](https://electronjs.org) and the rest of the [node.js](https://nodejs.org) ecosystem; all written in Javascript. The sample online demo server is written in Python using [Flask](https://flask.palletsprojects.com) to serve the web files and [Pipenv](https://pypi.org/project/pipenv/) to manage dependencies. No IDE is assumed; I have used [KDevelop](https://www.kdevelop.org/).

## TODO: System Models
This section includes diagrams showing relationships between major system components and the environment. It may include one or more of the following:

### Context Models
Context Models: what is part of the system and what is not. Includes model diagrams and activity diagrams

![Context diagram](https://raw.githubusercontent.com/mapper1024/mapper1024/master/diagrams/Context_Diagram.png)

### Interaction Models
Interaction Models: user to inputs/outputs, software to other systems/environment or among components in a system. Includes use-case digrams and sequence diagrams)

### Structure Models
Structural Models: how the components of the system relate to one another in a static manner. Includes class diagrams (top-level, detailed, aggregation/generalization), component diagrams, deployment diagrams, package diagrams, profile diagrams, and composite structure diagrams.

![Package diagram](https://raw.githubusercontent.com/mapper1024/mapper1024/master/diagrams/Package_Diagram.png)
![Class diagram](https://raw.githubusercontent.com/mapper1024/mapper1024/master/diagrams/Class_Diagram.png)

### Behavior Models
Behavorial Models: show the dynamic behavior of the system as it executes. It includes activity (for data-flow), state/state-machine diagrams (event-flow), or timing diagrams

### Database
Entity-Retionship diagrams (for database design) with schema reduction and normalization to third-normal-form (3NF) or Boyd-Codd Normal Form (BCNF) dependening on need for preserving functional dependencies (FDs, essentially business/logic rules).

![Entity-Relationship diagram](https://raw.githubusercontent.com/mapper1024/mapper1024/master/diagrams/database.png)

## TODO: Operational Scenarios
This section may include a set of scenarios that illustrate, from the user's perspective, what should be experienced when utilizing the system under various situations. In the article Inquiry-Based Requirements Analysis (IEEE Software, March 1994), scenarios are defined as follows:

> A scenario is simply a proposed specific use of the system. More specifically, a scenario is a description of one or more end-to-end transactions involving the required system and its environment. Scenarios can be documented in different ways, depending on the level of detail needed. The simplest form is a use-case diagram, which consists of a labeled interaction between actors. More detailed forms are called scripts. These are usually represented as tables or sequence diagrams and involve identifying a sequence of actions and the agent (doer) of each action.

Although scenarios are useful in acquiring and validating requirements, they are not themselves requirements, because they describe the system's behavior only in specific situations; a specification, on the other hand, describes what the system should do in general.

You may want to include user stories here as an alternative for describing operational scenarios

# Mapping Tool
* Benjamin Leskey
* Mount Vernon Nazarene University
* 2022-09-11

## Introduction

### System Overview
The mapping tool software is for lay users such as authors, storytellers, and role-playing gamers to create maps for their worlds or fictional environments. It is intended for use as desktop software or a web app in a desktop environment; as well as being used as an embedded component in other web apps.

### Human Resources
As part of the Honors division of this project, a group of testers will receive incremental releases to give feedback on as major milestones are developed: the software is developed for myself, them, and anyone else who may find the tool useful.

## User Requirements (written for customers, may need user stories and/or use case diagrams)

### User Objectives
The mapping tool software MUST allow users (e.g. authors or other storytellers) to create custom (e.g. fictional) maps for their worlds or environments. These maps may be used to organize world-building, create book illustrations, or showcase a story, to list a few possibilities.

The mapping tool MUST allow users to draw maps at a higher level than simply placing pre-made props or drawing pixels. Users can place map objects like a river, a forest, a castle, or an island with specified dimensions without concerning themselves about how specifically the object will look on the screen. The software MUST provide controls so that the user can edit the map and objects on the map in real dimensions (e.g. meters).

The mapping tool SHOULD allow users to render/print their maps to images in pretty format suitable as an illustration or display of a fictional world.

Basic help information MUST be included, interactive help SHOULD be provided, and a tutorial is a WISH-LIST item.

The primary use of the mapping tool is as desktop software (either running locally or in a browser) where the user uses the mouse and keyboard to create and edit their maps, which are saved as files. Mobile support is a WISH-LIST feature.
The mapping tool SHOULD be useable as a component in a web app, where the backend that stores the map data is defined by the surrounding system allowing for, e.g., remote storage or collaborative editing.
The mapping tool SHOULD support pluggable renderer components, so that the same map may be rendered in different styles (e.g. like a Tolkien map, or like a geographical survey). A default fallback renderer with simple image generation MUST be developed to support the minimal feature set. One renderer---in a generic, vaguely realistic style---SHOULD be included with the tool for core mapping functionality, but additional renderers are WISH-LIST features.

### Similar System Information
The mapping tool is intended for use as a standalone desktop app, or as an in-browser desktop app. It should also be usable as an embedded component in other web apps, as it SHOULD provide an interface for loading custom UI interactions and custom map backends. The mapping UI and renderer is a separate component from the underlying database.

### User Characteristics
The user community consists of people with all levels of computer expertise; they should need no prior experience with, e.g., image-editing to be able to use the software.

## Functional or System Requirements

### The mapping tool should allow creating and editing maps.
The mapping tool should let users create and editing individual maps, that represent arbitrary geography useful for storytelling organization.

* Inputs: User input and control.
* Outputs: A "map" which is a representation of the designed map.
* Criticality: MUST-HAVE, this is what the tool is for.

## Interface Requirements

### User Interfaces
The primary interface into the system that MUST exist is the map editing UI. This provides controls to edit existing maps and a display of the map in editing. An interface to export maps as image files SHOULD also exist. The primary interface MUST be supplanted with controls to create new maps, save maps, and otherwise manage multiple maps---the exact behavior depends on the platform and system the mapping tool is running on. Basic command-line options MUST be supported to load existing maps.

### Hardware Interfaces
The mapping tool MUST interface with the mouse for drawing the map and selecting options, and SHOULD interface with the keyboard for faster editing.

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
Updates to the mapping tool will be distributed through the existing Github system; users may install new updates as they come. Automatic updates are a WISH-LIST feature.

### Reliability
N/A

### Robustness
The system MUST fail early and explicitly when an error condition occurs, and SHOULD atomically save maps to avoid corruption.

### Availabilty
N/A

### Safety
The mapping tool MUST be as safe as an average image-editor. Possible loss of data may be avoided through automatic revision saving or other backups.

### Maintenance
The mapping tool SHOULD automatically deploy numbered version releases through Github CI. Download links SHOULD automatically point to the most recent numbered version release.

### Portability
The mapping tool MUST support Windows 10+, and Ubuntu 20.04+ or other similar Linux distribution. The mapping tool SHOULD support Mac OS 11+. The mapping tool might support Android and iOS as a WISH-LIST feature. The mapping tool MUST support the latest version of Google Chrome/Chromium (including Microsoft Edge), and SHOULD support the latest versions of Safari and Mozilla Firefox.

### Extensibility
The mapping tool SHOULD support importing maps from previous versions throughout the development process. The mapping tool MUST support importing maps from previous versions after the first major release to the public (v1.0).

### Development Process Constraints
The development environment assumes a UNIX-like system for development scripts (such as for managing version numbers), but the program may be built and run using any platform supported by [Electron](https://electronjs.org). The desktop app development environment uses [Yarn](https://www.npmjs.com/package/yarn) to access [Electron](https://electronjs.org) and the rest of the [node.js](https://nodejs.org) ecosystem; all written in Javascript. The sample online demo server is written in Python using [Flask](https://flask.palletsprojects.com) to serve the web files and [Pipenv](https://pypi.org/project/pipenv/) to manage dependencies. No IDE is assumed; I have used [KDevelop](https://www.kdevelop.org/).

## System Models
This section includes diagrams showing relationships between major system components and the environment. It may include one or more of the following:

-Context Models: what is part of the system and what is not. Includes model diagrams and activity diagrams

-Interaction Models: user to inputs/outputs, software to other systems/environment or among components in a system. Includes use-case digrams and sequence diagrams)

-Structural Models: how the components of the system relate to one another in a static manner. Includes class diagrams (top-level, detailed, aggregation/generalization), component diagrams, deployment diagrams, package diagrams, profile diagrams, and composite structure diagrams.

-Behavorial Models: show the dynamic behavior of the system as it executes. It includes activity (for data-flow), state/state-machine diagrams (event-flow), or timing diagrams

-Entity-Retionship diagrams (for database design) with schema reduction and normalization to third-normal-form (3NF) or Boyd-Codd Normal Form (BCNF) dependening on need for preserving functional dependencies (FDs, essentially business/logic rules).

## Operational Scenarios
This section may include a set of scenarios that illustrate, from the user's perspective, what will be experienced when utilizing the system under various situations. In the article Inquiry-Based Requirements Analysis (IEEE Software, March 1994), scenarios are defined as follows:

> A scenario is simply a proposed specific use of the system. More specifically, a scenario is a description of one or more end-to-end transactions involving the required system and its environment. Scenarios can be documented in different ways, depending on the level of detail needed. The simplest form is a use-case diagram, which consists of a labeled interaction between actors. More detailed forms are called scripts. These are usually represented as tables or sequence diagrams and involve identifying a sequence of actions and the agent (doer) of each action.

Although scenarios are useful in acquiring and validating requirements, they are not themselves requirements, because they describe the system's behavior only in specific situations; a specification, on the other hand, describes what the system should do in general.

You may want to include user stories here as an alternative for describing operational scenarios

## Appendices
Specifies other useful information for understanding the requirements. Most requirements should include at least the following two appendices:

- **Definitions, Acronyms, Abbreviations**

Provides definitions of specialized terms or acronyms that must be understood in the context of this application.

- **References**

Provides complete citations or URLs for all documents and websites referenced or used in the preparation of this document. Use MLA, APA, or other appropriate citation system (be consistent and use MLA throughout or APA throughout, etc.).

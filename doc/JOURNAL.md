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

# References
* Rigaux, P., Scholl, M., & Voisard, A. (2001). *Spatial databases with application to GIS*. Morgan Kaufmann.

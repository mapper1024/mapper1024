# Unit Tests
Unit testing is done through the [mocha](https://mochajs.org/) framework via [electron-mocha](https://yarnpkg.com/package/electron-mocha). Unit testing is used as regression testing for utility classes and methods used throughout the program, such as the geometry classes and the hook container. Most importantly, unit testing is used to ensure the correct behavior of the databases, both the native SQLite3 backend and the sql.js web backend for all common tasks as well as the unique properties of each backend. Unit testing is also used to ensure that databases can be losslessly opened and transferred between the two backends.

The components and classes that are unit tested include:

Component | Type
--------- | ----
asyncFrom() | Utility method
Box3 | Geometry class
SQLite3 backend | Database backend
HookCountainer | Utility class
Line3 | Geometry class
merge() | Utility method
mod() | Utility method
Path | Geometry class
sql.js backend | Database backend
SQLite3 <-> sql.js compatibility | Database backends
Vector3 | Geometry class

# Component Tests
# System Tests
# User Tests
# Performance Tests

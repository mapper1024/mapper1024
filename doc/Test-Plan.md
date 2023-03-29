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

To run the unit tests, simply run the command: `yarn test` which will invoke electron-mocha and run all of the unit tests. The unit tests are required by the Github Actions workflow before a release can be made, and unit test failures will show up in pull requests and on any branch that gets pushed to Github.

# Requirement Tests

## Scripted Tests (Electron desktop app)

### The user should be able to discover the physical area covered by an arbitrary area on the map

1. Load the sample map
2. Select the "calculate area" brush (press 'c')
3. Click once on the map to select a circular area.
4. EXPECT: The program will display the appropriate area calculation in the palette. If the brush diameter was 1200m, for example, then the calculated area should be 1.13km²; if the brush diameter was 300m, then the calculated area should be 0.07km².
5. Press the "reset" button (shift+'c') near the calculated area display.
6. EXPECT: The selected area should be cleared and the calculation reset.
7. Click and drag to select an area on the map with the brush. Lift the mouse and then click and drag some more at least once.
8. EXPECT: The selected area will only increase as you drag the brush over areas not previously selected.
9. Select the entire main sample island, as close to the borders as you can, including water on the island.
10. EXPECT: the area should come out to roughly ~7km², depending on how close to the actual shape of the island you selected.
11. Hold shift and click and drag across your selection.
12. EXPECT: The selection you drag over should be removed, and the calculated area decrease accordingly.

### The user should be able to discover the distance between arbitrary points on the map

1. Load the sample map
2. Select the "distance peg (1)" brush (press '1')
3. Click once on the map near the "House of the Elves"
4. EXPECT: The first distance peg will be placed on the map, indicating its position and coordinates.
5. Select the "distance peg (2)" brush (press '2')
6. Click once on the map near the "King's Castle"
7. EXPECT: The second distance peg will be placed on the map.
8. EXPECT: The calculated distance between the two pegs will be roughly 1.3km, indicated on a line between the two points as well as in the palette.
9. Zoom lower and higher than the initial zoom level.
10. EXPECT: The calculated distance will never change between zoom levels, and the distance pegs will remain on top of where they were placed.

### The map must have a representation of explicit objects

1. Load the sample map
2. EXPECT: Explicit objects such as the "King's Boulder" and the "Great Tree" will be displayed standing out from normal terrain as explicit, specific objects.
3. Select an explicit object type such as "Tree" (in the add brush menu, Forest -> Tree).
4. Place a tree on the map.
5. Vary the brush size and place another tree.
6. EXPECT: Each tree will be placed and displayed on the map, sized to match the brush size when they were placed.
7. Select the "delete" brush (press 'd').
8. Hold shift and click on one of the trees.
9. EXPECT: The tree will be deleted.

### The map must support multiple layers

1. Load the sample map.
2. EXPECT: The geographical layer should be selected in the palette.
3. Draw geographical terrain such as water or sand around the "desert kingdom"'s borders.
4. EXPECT: The terrain is drawn underneath the political borders of the desert kingdom.
5. Select the "select" brush (press 's')
6. Mouse over the "desert kingdom".
7. EXPECT: Only the terrain within the "desert kingdom" will be highlighted as selectable; the political region will not be highlighted.
8. Switch to the political layer (press 'l')
9. EXPECT: Now no terrain will be highlighted as selectable, only the political region of the "desert kingdom" will be highlighted.
10. Switch to the add brush (press 'a')
11. EXPECT: Only political map objects should be selectable in the palette (region, route).
12. Choose the "region" map object to add, and add a region to the map.
13. EXPECT: The region should encapsulate the area brushed over, and should be displayed over the terrain.
14. Choose the "delete" brush (press 'd')
15. Click and drag over an area of the political region you added.
16. EXPECT: Pieces of the political region should be deleted, but not the terrain underneath.

### The mapping tool should let users create maps

1. Press the "new map" button (Control+'n')
2. EXPECT: The map should be cleared and all zoom and pan reset.
3. Draw any terrain on the map.
4. EXPECT: The terrain should appear.

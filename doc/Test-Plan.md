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

### The mapping tool should let users edit maps at an arbitrary scale

1. Load the sample map.
2. Zoom in and out of the map (Ctrl+'+' and Ctrl+'-')
3. EXPECT: The map should maintain scale, shape, and editability.

### Maps must be persistent

1. Load the sample map.
2. Make any visible change to the map.
3. Save the map (Ctrl+'s') to a unique filename.
4. Create a new map (Ctrl+'n')
5. Make any change (new terrain, new map object, etc.)
6. Save the map (Ctrl+'s') to a unique filename.
7. Open (Ctrl+'o') the first map that you saved.
8. EXPECT: The first map that you saved will be loaded; it will be the sample map with whatever changes you made before saving.
9. Open (Ctrl+'o') the second map that you saved.
10. EXPECT: The second map that you saved will be loaded; it will be a fresh new map with whatever additions you made before saving.

### Drawing objects on the map

1. Load the sample map.
2. Select "Water" from the brush palette.
3. Change the brush size ("w"+scroll) to an arbitrary size
4. Click and drag across the map
5. EXPECT: Water will be added to the map according to your brush strokes.

### Extending objects on the map

1. Load the sample map.
2. Switch to the "extend" brush (press 'e').
3. Select "grass" from the brush palette.
4. Click and drag over a forest on the map.
5. EXPECT: An error message indicating that you can't extend forest with grass.
6. Click and drag over grassland on the map, starting on the island and going out into the sea.
7. EXPECT: The grassland will be extended according to your brush strokes.
8. EXPECT: The selection hover will indicate that the original grassland and your extended part are the same object.

### Selecting objects on the map

1. Load the sample map.
2. Mouse over any labeled object.
3. EXPECT: The label will change to indicate you are hovering over it.
4. Switch to the "select" brush (press 's').
5. EXPECT: The map object you are mousing over will be indicated.
6. Click to select a map object.
7. EXPECT: The selection indicator will change to indicate the selected object.
8. EXPECT: Information about the selected object will be displayed in the brush palette.
9. Hold control and click on another map object.
10. EXPECT: The selection indicator and information in the brush palette should include the new object.
11. Click on an unselected map object.
12. EXPECT: The selection resets to select only the latest clicked map object.
13. Switch back to the "add" brush (press 'a').
14. EXPECT: The selection information will no longer be displayed.

### Merging objects on the map

1. Create a new map.
2. Choose the "water" map object from the brush palette.
3. Draw two separate water objects on the map.
4. Choose the "select" brush (press 's').
5. Click on the first water object, then hold Control and click on the second water object, to select both.
6. EXPECT: A merge option will appear in the brush palette.
7. Click on the merge button (press 'm').
8. EXPECT: The selection information will update to show that the two objects have become one.
9. Choose the "add" brush (press 'a').
10. Add a "grass" map object.
11. Choose the "select" brush (press 's').
12. Select the water object if it is not already selected.
13. Hold control and click on the grass object so that both it and the water object are selected.
14. Press 'm' to try to merge the objects.
15. EXPECT: There should not be a merge option, and the 'm' shortcut did nothing; the objects remain separate.

### Moving objects on the map

1. Load the sample map.
2. Choose the "select" brush (press 's').
3. Click on any map object to select it.
4. Click and drag the map object.
5. EXPECT: The map object will move on the map to follow the movement of the mouse.

### Deleting objects from the map

1. Load the sample map.
2. Choose the "delete" brush (press 's').
3. Hold shift and click on any map object.
4. EXPECT: The map object should be deleted from the map.
5. Increase the brush size ("w"+scroll)
6. Click and drag over any map objects.
7. EXPECT: Roughly the area dragged over will be deleted.

### Panning the map

1. Load the sample map.
2. Hold right click and drag (or press the arrow keys).
3. EXPECT: The map will pan according to the input.

### Undo and redoing editing actions

1. Load the sample map.
2. Add water to the map.
3. Undo (press Ctrl+"z").
4. EXPECT: The water will be gone.
5. Redo (press Ctrl+"y").
6. EXPECT: The water will return.
7. Add sand to the map.
8. Undo (press Ctrl+"z").
9. EXPECT: The sand will be gone.
10. Add grass to the map.
11. Try to redo (press Ctrl+"y").
12. EXPECT: Nothing will happen, the redo has been overwritten by the new change.

### Naming map objects

1. Load the sample map.
2. Mouse over the thick vegetation on the south of the island.
3. Press "n" to open the naming dialog.
4. Type a name and press enter.
5. EXPECT: The name will appear as the map object's label.
6. Choose the "select" brush (press "s").
7. Click on any map object.
8. EXPECT: A text input box in the brush palette to set or change the map object's label.
9. Use the text input box to set or change the map object's name.
10. Save the label (press "enter").
11. EXPECT: The map object's label will change accordingly.

### Exporting the map as an image

1. Load the sample map.
2. Click "export as image" in the palette (press Ctrl+"e").
3. Click and drag an area on the map to be exported.
4. EXPECT: The area you selected will be indicated on the map.
5. EXPECT: The area in square kilometers of the selected area will be displayed in the palette, along with the size in pixels of the image to be exported.
6. Zoom in once and then out twice (press Ctrl+"+" and Ctrl+"-").
7. EXPECT: The selected area will remain the same on the actual map.
8. Choose "export" in the palette (press "enter").
9. EXPECT: The program will download an image file containing the exported area of the map.
10. Click "export as image" in the palette (press Ctrl+"e").
11. Choose "cancel" in the palette (press "escape").
12. EXPECT: The export should be canceled without incident.

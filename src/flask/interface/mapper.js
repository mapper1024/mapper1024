/* Load mapper and insert into main UI.
 * NOTE: We don't have to serve the mapper ourselves; we could import from the bundled library version,
 * but this way makes it easier to test changes without rebundling.
 */
import { Mapper, SqlJsMapBackend } from "../mapper/index.js";

let renderedMap;

function loadMap(map) {
	if(renderedMap) {
		renderedMap.disconnect();
	}
	map.load().then(function() {
		const mapper = new Mapper(map);
		renderedMap = mapper.render(document.getElementById("mapper"));
		renderedMap.hooks.add("draw_help", function(options) {
			options.infoLine("Shift+N to make a blank map.");
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "N", async () => {
			loadMap(new SqlJsMapBackend());
		});
	});
}

loadMap(new SqlJsMapBackend("/samples/sample_map.map"));

// TODO: Register backend based on API calls back to Flask server.

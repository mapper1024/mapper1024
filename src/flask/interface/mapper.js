/* Load mapper and insert into main UI.
 * NOTE: We don't have to serve the mapper ourselves; we could import from the bundled library version,
 * but this way makes it easier to test changes without rebundling.
 */
import { Mapper, SqlJsMapBackend } from "../mapper/index.js";

const map = new SqlJsMapBackend();
map.load().then(function() {
	const mapper = new Mapper(map);
	mapper.render(document.getElementById("mapper"));
});

// TODO: Register backend based on API calls back to Flask server.

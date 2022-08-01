/* Load mapper and insert into main UI.
 * NOTE: We don't have to serve the mapper ourselves; we could import from the bundled library version,
 * but this way makes it easier to test changes without rebundling.
 */
import { Mapper, SqlJsMapBackend } from "../mapper/index.js";

let renderedMap;

function loadMap(map) {
	map.load().then(function() {
		if(renderedMap) {
			renderedMap.disconnect();
		}

		const mapper = new Mapper(map);
		renderedMap = mapper.render(document.getElementById("mapper"));
		renderedMap.hooks.add("draw_help", function(options) {
			options.infoLine("Shift+O to open, Shift+S to save, Shift+N to make a blank map.");
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "N", async () => {
			loadMap(new SqlJsMapBackend());
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "S", async () => {
			const a = document.createElement("a");
			const url = window.URL.createObjectURL(new Blob([await map.getData()], {type: "octet/stream"}));
			a.href = url;
			a.download = `Map at ${new Date(Date.now()).toISOString()}.map`;
			a.click();
			window.URL.revokeObjectURL(url);
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "O", async () => {
			const input = document.createElement('input');
			input.type = 'file';

			input.onchange = async (e) => {
				const file = e.target.files[0];

				loadMap(new SqlJsMapBackend({
					loadFrom: "data",
					data: new Uint8Array(await file.arrayBuffer()),
				}));
			}

			input.click();
		});
	}).catch(error => {
		alert(`Could not load the map: ${error}`);
	});
}

loadMap(new SqlJsMapBackend({
	loadFrom: "url",
	url: "/samples/sample_map.map",
}));


window.addEventListener("beforeunload", function (e) {
	e.preventDefault();
	e.returnValue = "Did you save any changes?";
});

// TODO: Register backend based on API calls back to Flask server.

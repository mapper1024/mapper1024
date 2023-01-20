import { Mapper, SqlJsMapBackend } from "./mapper/index.js";

let renderedMap;

function loadMap(map, failToBlank) {
	map.load().then(function() {
		if(renderedMap) {
			renderedMap.disconnect();
		}

		const mapper = new Mapper(map);
		renderedMap = mapper.render(document.getElementById("mapper"));

		const systemButtons = document.createElement("div");
		systemButtons.setAttribute("class", "mapper1024_zoom_row");
		renderedMap.brushbar.setSystemButtons(systemButtons);

		const openAction = async () => {
			const input = document.createElement("input");
			input.type = "file";

			input.onchange = async (e) => {
				const file = e.target.files[0];

				loadMap(new SqlJsMapBackend({
					loadFrom: "data",
					data: new Uint8Array(await file.arrayBuffer()),
				}));
			};

			input.click();
		};

		const newAction = async () => {
			loadMap(new SqlJsMapBackend());
		};

		const saveAction = async () => {
			const a = document.createElement("a");
			const url = window.URL.createObjectURL(new Blob([await map.getData()], {type: "octet/stream"}));
			a.href = url;
			a.download = `Map at ${new Date(Date.now()).toISOString()}.map`;
			a.click();
			window.URL.revokeObjectURL(url);
		};

		const newButton = document.createElement("button");
		newButton.setAttribute("class", "mapper1024_zoom_button");
		newButton.innerText = "🗎";
		newButton.setAttribute("title", "New map [shortcut: Shift+n]");
		newButton.onclick = async () => {
			await newAction();
			renderedMap.focus();
		};
		systemButtons.appendChild(newButton);

		const openButton = document.createElement("button");
		openButton.setAttribute("class", "mapper1024_zoom_button");
		openButton.innerText = "📁";
		openButton.setAttribute("title", "Open map [shortcut: Shift+o]");
		openButton.onclick = async () => {
			await openAction();
			renderedMap.focus();
		};
		systemButtons.appendChild(openButton);

		const saveButton = document.createElement("button");
		saveButton.setAttribute("class", "mapper1024_zoom_button");
		saveButton.innerText = "💾";
		saveButton.setAttribute("title", "Save map [shortcut: Shift+s]");
		saveButton.onclick = async () => {
			await saveAction();
			renderedMap.focus();
		};
		systemButtons.appendChild(saveButton);

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "N", async () => {
			newAction();
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "S", async () => {
			saveAction();
		});

		renderedMap.registerKeyboardShortcut((context, event) => event.key === "O", async () => {
			openAction();
		});
	}).catch(error => {
		alert(`Could not load the map: ${error}`);
		if(failToBlank) {
			loadMap(new SqlJsMapBackend());
		}
	});
}

loadMap(new SqlJsMapBackend({
	loadFrom: "url",
	url: "./mapper/samples/sample_map.map",
}), true);

window.addEventListener("beforeunload", function (e) {
	e.preventDefault();
	e.returnValue = "Did you save any changes?";
});

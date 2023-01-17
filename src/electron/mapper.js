const path = require("path");
const { ipcRenderer } = require("electron");
const { dialog, process, app } = require("@electron/remote");
import { Mapper } from "../../mapper/index.js";
import { SQLiteMapBackend } from "./sqlite_map_backend.js";

let renderedMap;

/** Have the user confirm clearing/closing of the map if there are unsaved changes.
 * @returns {boolean} true if the user wants to clear/close, false if not.
 */
async function confirmClear() {
	if(renderedMap) {
		if(renderedMap.mapper.hasUnsavedChanges()) {
			return (await dialog.showMessageBox({
				message: "Continue and lose unsaved changes?",
				title: "Lose changes?",
				type: "warning",
				buttons: ["Continue", "Cancel"],
				defaultId: 1,
			})).response === 0;
		}
	}
	return true;
}

/** Generate a new blank map. */
async function blankMap() {
	return new SQLiteMapBackend(":memory:");
}

/** Load a map into the display.
 * @param backend {MapBackend} the map to load. backend.load() will be called by this method, do not call it prior to passing it.
 * @param failToBlank {boolean|undefined} If true and this is the first map loaded, an error when loading will just load a blank map after reporting the error.
 */
async function loadMap(backend, failToBlank) {
	try {
		await backend.load();
	} catch(error) {
		await dialog.showErrorBox("Could not load map...", error.message);
		// If this is the first map we've tried to load, fail out.
		if(!renderedMap) {
			if(failToBlank) {
				loadMap(await blankMap());
			} else {
				app.quit();
			}
		}
		return;
	}

	const openPath = () => backend.filename;
	const openPathIsTemporary = () => (openPath() === ":memory:");
	const openPathIsReadOnly = () => backend.options.readOnly;
	const openFilename = () => openPath().split("/").pop();

	const mapper = new Mapper(backend);
	if(renderedMap) {
		renderedMap.disconnect();
	}
	renderedMap = mapper.render(document.getElementById("mapper"));

	const newAction = async () => {
		if(await confirmClear()) {
			await loadMap(await blankMap());
		}
	}

	async function saveAs() {
		const save = await dialog.showSaveDialog({
			title: "Save as...",
			properties: ["showOverwriteConfirmation", "createDirectory"],
			filters: [
				{name: "Maps", extensions: ["map"]},
				{name: "All Files", extensions: ["*"]},
			],
		});
		if(!save.canceled) {
			let path = save.filePath;
			const splitOnDot = path.split("/").pop().split(".");
			if(splitOnDot.length < 2) {
				path = path + ".map";
			}
			await mapper.backend.save(path, true);
			mapper.clearUnsavedChangeState();
		}
	}

	const saveAction = () => {
		if(openPathIsTemporary() || openPathIsReadOnly()) {
			saveAs();
		}
		else {
			backend.flush();
			mapper.clearUnsavedChangeState();
		}
	}

	const openAction = async () => {
		const open = await dialog.showOpenDialog({
			title: "Open...",
			properties: ["openFile"],
			filters: [
				{name: "Maps", extensions: ["map"]},
				{name: "All Files", extensions: ["*"]},
			],
		});
		for(const filePath of open.filePaths) {
			if(await confirmClear()) {
				await loadMap(new SQLiteMapBackend(filePath));
			}
			return;
		}
	}

	const systemButtons = document.createElement("div");
	systemButtons.setAttribute("class", "mapper1024_zoom_row");
	renderedMap.brushbar.setSystemButtons(systemButtons);

	const newButton = document.createElement("button");
	newButton.setAttribute("class", "mapper1024_zoom_button");
	newButton.innerText = "🗎";
	newButton.setAttribute("title", "New map [shortcut: Control+n]");
	newButton.onclick = async () => {
		await newAction();
		renderedMap.focus();
	};
	systemButtons.appendChild(newButton);

	const openButton = document.createElement("button");
	openButton.setAttribute("class", "mapper1024_zoom_button");
	openButton.innerText = "📁";
	openButton.setAttribute("title", "Open map [shortcut: Control+o]");
	openButton.onclick = async () => {
		await openAction();
		renderedMap.focus();
	};
	systemButtons.appendChild(openButton);

	const saveButton = document.createElement("button");
	saveButton.setAttribute("class", "mapper1024_zoom_button");
	saveButton.innerText = "💾";
	saveButton.setAttribute("title", "Save map [shortcut: Control+s]");
	saveButton.onclick = async () => {
		await saveAction();
		renderedMap.focus();
	};
	systemButtons.appendChild(saveButton);

	const saveAsButton = document.createElement("button");
	saveAsButton.setAttribute("class", "mapper1024_zoom_button");
	saveAsButton.innerText = "💾...";
	saveAsButton.setAttribute("title", "Save map as... [shortcut: Control+s]");
	saveAsButton.onclick = async () => {
		saveAs();
		renderedMap.focus();
	};
	systemButtons.appendChild(saveAsButton);

	// Ctrl+N: New Map
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "n", async () => {
		newAction();
	});

	// Ctrl+Shift+S: Save As
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "S", async () => saveAs());

	// Ctrl+S: Save
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "s", async () => {
		saveAction();
	});

	// Ctrl+O: Open
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "o", async () => {
		openAction();
	});

	function updateTitle() {
		let title = openPathIsTemporary() ? "New map" : openFilename();
		if(openPathIsReadOnly()) {
			title += " [read-only]";
		}
		if(mapper.hasUnsavedChanges()) {
			title += " *";
		}
		document.title = title;
	}

	// If we're autosaving to a file, just constantly clear the unsaved changed state.
	if(!openPathIsTemporary() && backend.options.autosave) {
		mapper.hooks.add("update", () => mapper.clearUnsavedChangeState());
	}

	mapper.hooks.add("unsavedStateChange", () => ipcRenderer.invoke("updateSavedChangeState", mapper.hasUnsavedChanges()));
	mapper.hooks.add("unsavedStateChange", () => updateTitle());

	mapper.clearUnsavedChangeState();
	renderedMap.focus();
}

const argv = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);

// If there are no arguments, load the sample map. Otherwise, load the map specified on the command line.
window.addEventListener("DOMContentLoaded", async () => {
	const sampleMap = async () => await new SQLiteMapBackend((app.isPackaged ? path.dirname(app.getAppPath()) : app.getAppPath()) + "/samples/sample_map.map", {
		readOnly: true,
	});
	if(argv.length === 0) {
		await loadMap(await sampleMap(), true);
	}
	else {
		await loadMap(new SQLiteMapBackend(argv[0]));
	}
});



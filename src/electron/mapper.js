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

	renderedMap.hooks.add("draw_help", function(options) {
		options.infoLine("Ctrl+O to open, Ctrl+S to save, Ctrl+Shift+S to save as, Ctrl+N to make a blank map.");
	});

	// Ctrl+N: New Map
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "n", async () => {
		if(await confirmClear()) {
			await loadMap(await blankMap());
		}
	});

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

	// Ctrl+Shift+S: Save As
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "S", async () => saveAs());

	// Ctrl+S: Save
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "s", async () => {
		if(openPathIsTemporary() || openPathIsReadOnly()) {
			saveAs();
		}
		else {
			backend.flush();
			mapper.clearUnsavedChangeState();
		}
	});

	// Ctrl+O: Open
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "o", async () => {
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



const { ipcRenderer } = require("electron");
const { dialog } = require("@electron/remote");
import { Mapper } from "../../mapper/index.js";
import { SQLiteMapBackend } from "./sqlite_map_backend.js";

let renderedMap;

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

async function blankMap() {
	return new SQLiteMapBackend(":memory:");
}

async function loadMap(backend) {
	try {
		await backend.load();
	} catch(error) {
		await dialog.showErrorBox("Could not load map...", error.message);
		return;
	}

	const openPath = backend.filename;
	const openPathIsTemporary = openPath === ":memory:";
	const openFilename = openPath.split("/").pop();

	const mapper = new Mapper(backend);
	if(renderedMap) {
		renderedMap.disconnect();
	}
	renderedMap = mapper.render(document.getElementById("mapper"));

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
			await mapper.backend.duplicate(path);
			await loadMap(new SQLiteMapBackend(path));
		}
	}

	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "S", async () => saveAs());

	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "s", async () => {
		// If this is a temporary file, show the option to save to a permanent file. Otherwise the SQLite backend autosaves.
		if(openPathIsTemporary) {
			saveAs();
		}
	});

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
		let title = openPathIsTemporary ? "New map" : openFilename;
		if(mapper.hasUnsavedChanges()) {
			title += " *";
		}
		document.title = title;
	}

	// SQLite autosaves.
	if(!openPathIsTemporary) {
		mapper.hooks.add("update", () => mapper.clearUnsavedChangeState());
	}
	mapper.hooks.add("update", () => ipcRenderer.invoke("updateSavedChangeState", mapper.hasUnsavedChanges()));
	mapper.hooks.add("update", () => updateTitle());
	updateTitle();

	renderedMap.focus();
}

window.addEventListener("DOMContentLoaded", async () => {
	await loadMap(await blankMap());
});



const { ipcRenderer } = require("electron");
const { dialog, process, app } = require("@electron/remote");
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
		if(!renderedMap) {
			app.quit();
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

	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "S", async () => saveAs());

	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "s", async () => {
		if(openPathIsTemporary() || openPathIsReadOnly()) {
			saveAs();
		}
		else {
			backend.flush();
			mapper.clearUnsavedChangeState();
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
		let title = openPathIsTemporary() ? "New map" : openFilename();
		if(openPathIsReadOnly()) {
			title += " [read-only]";
		}
		if(mapper.hasUnsavedChanges()) {
			title += " *";
		}
		document.title = title;
	}

	if(!openPathIsTemporary() && backend.options.autosave) {
		mapper.hooks.add("update", () => mapper.clearUnsavedChangeState());
	}
	mapper.hooks.add("unsavedStateChange", () => ipcRenderer.invoke("updateSavedChangeState", mapper.hasUnsavedChanges()));
	mapper.hooks.add("unsavedStateChange", () => updateTitle());

	mapper.clearUnsavedChangeState();
	renderedMap.focus();
}

const argv = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);

window.addEventListener("DOMContentLoaded", async () => {
	await loadMap(argv.length === 0 ? await new SQLiteMapBackend(app.getAppPath() + "/samples/sample_map.map", {
		readOnly: true,
	}) : new SQLiteMapBackend(argv[0]));
});



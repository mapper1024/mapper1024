// Boilerplate code to load index.html as an app.

const remoteMain = require("@electron/remote/main");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

remoteMain.initialize();

const createWindow = () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	remoteMain.enable(win.webContents);

	let unsavedChanges = false;

	win.on("close", (event) => {
		event.preventDefault();
		if(!unsavedChanges || dialog.showMessageBoxSync({
			message: "Lose unsaved changes?",
			title: "Lose changes?",
			type: "warning",
			buttons: ["Continue", "Cancel"],
			defaultId: 1,
		}) === 0) {
			win.destroy();
		}
	});

	ipcMain.handle("updateSavedChangeState", (event, hasUnsavedChanges) => {
		if(event.sender.id === win.id) {
			unsavedChanges = hasUnsavedChanges;
		}
	});

	win.loadFile("src/electron/index.html");

	return win;
};

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

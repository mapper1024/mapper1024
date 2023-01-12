// Boilerplate code to load index.html as an app.

const remoteMain = require("@electron/remote/main");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

remoteMain.initialize();

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1024,
		height: 768,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	remoteMain.enable(win.webContents);

	let unsavedChanges = false;

	// When the window is closed, check if we have unsaved changes and therefore need the user to confirm.
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

	// Remote handler for the mapper to update whether we have unsaved changes that should prevent closing.
	ipcMain.handle("updateSavedChangeState", (event, hasUnsavedChanges) => {
		if(event.sender.id === win.id) {
			unsavedChanges = hasUnsavedChanges;
		}
	});

	// Disable browser zoom.
	win.webContents.on('did-finish-load', () => {
		win.webContents.setZoomFactor(1);
		win.webContents.setVisualZoomLevelLimits(1, 1);
	})

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

// Tell chromium to ignore system scaling since we provide our own zoom/scaling.
app.commandLine.appendSwitch("high-dpi-support", 1);
app.commandLine.appendSwitch("force-device-scale-factor", 1);

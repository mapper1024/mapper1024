// Boilerplate code to load index.html as an app.

const { app, BrowserWindow } = require("electron");

const path = require("path");

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

	win.loadFile("src/electron/index.html");
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

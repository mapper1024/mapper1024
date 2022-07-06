import { Mapper } from "../../mapper/index.js";
import { SQLiteMapBackend } from "./sqlite_map_backend.js";

const map = new SQLiteMapBackend(":memory:");
const mapper = new Mapper(map);

window.addEventListener("DOMContentLoaded", async () => {
	await map.load();

	const renderedMap = mapper.render(document.getElementById("mapper"));
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "s", () => {
		console.log("save");
	});
	renderedMap.registerKeyboardShortcut((context, event) => context.isKeyDown("Control") && event.key === "o", () => {
		console.log("open");
	});
	renderedMap.focus();
});

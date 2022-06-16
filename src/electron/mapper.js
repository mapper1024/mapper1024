import { Mapper } from "../../mapper/index.js";
import { SQLiteMapBackend } from "./sqlite_map_backend.js";
import { fillWithSimpleMap } from "../../test_datasets/simple_map.js";

const map = new SQLiteMapBackend(":memory:");
const mapper = new Mapper(map);

window.addEventListener("DOMContentLoaded", async () => {
	await map.load();

	await fillWithSimpleMap(map);

	mapper.render(document.getElementById("mapper")).focus();
});

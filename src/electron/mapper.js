import { Mapper } from "../../mapper/index.js"
import { SQLiteMapBackend } from "./sqlite_map_backend.js"

const map = new SQLiteMapBackend(":memory:")
const mapper = new Mapper(map)

map.load().then(() => mapper.render(document.getElementById("mapper")))

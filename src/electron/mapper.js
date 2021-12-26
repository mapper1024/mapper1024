import { Mapper } from "../../mapper/index.js"
import { SQLiteMapBackend } from "./sqlite_map_backend.js"

let mapper = new Mapper(new SQLiteMapBackend(":memory:"))
mapper.render(document.getElementById("mapper"))

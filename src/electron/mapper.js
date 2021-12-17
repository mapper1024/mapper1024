// Load mapper and insert into main UI.
import { Mapper, MemoryMapBackend } from "../../mapper/index.js"
let mapper = new Mapper(new MemoryMapBackend())
mapper.render(document.getElementById("mapper"))

// TODO: Register backend based on local files.

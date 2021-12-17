// Load mapper and insert into main UI.
import { Mapper } from "../../mapper/mapper.js"
import { MemoryMapBackend } from "../../mapper/backend.js"
let mapper = new Mapper(new MemoryMapBackend())
mapper.render(document.getElementById("mapper"))

// TODO: Register backend based on local files.

// Load mapper and insert into main UI.
import { Mapper } from "../mapper/index.js"
let mapper = new Mapper()
mapper.render(document.getElementById("mapper"))

// TODO: Register backend based on API calls back to Flask server.

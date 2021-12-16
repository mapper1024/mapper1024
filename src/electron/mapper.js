// Load mapper and insert into main UI.
import { Mapper } from "../../mapper/main.js";
let mapper = new Mapper();
mapper.render(document.getElementById("mapper"));

// TODO: Register backend based on local files.

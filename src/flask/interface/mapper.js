/* Load mapper and insert into main UI.
 * NOTE: We don't have to serve the mapper ourselves; we could import from the bundled library version,
 * but this way makes it easier to test changes without rebundling.
 */
import { Mapper } from "../mapper/index.js"
let mapper = new Mapper()
mapper.render(document.getElementById("mapper"))

// TODO: Register backend based on API calls back to Flask server.

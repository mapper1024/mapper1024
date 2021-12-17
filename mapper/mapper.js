/* Mapper interface
 * A connection to a database and mapper UI.
 * TODO: backend connection
 * Instantiate Mapper and then call the render() method to insert the UI into a div element.
 */
import { version } from "./version.js"

class Mapper {
	/* Set the backend for the mapper, i.e. the map it is presenting.
	 * See: backend.js
	 */
	constructor(backend) {
		this.backend = backend;
	}

	/* Render Mapper into a div element
	 * Example: mapper.render(document.getElementById("mapper_div"))
	 */
	render(element) {
		// TODO: UI
		element.innerHTML = "Hello from version " + version
	}
}

export { Mapper }

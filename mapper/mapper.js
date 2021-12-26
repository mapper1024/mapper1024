/* A render context of a mapper into a specific element.
 * Handles keeping the UI connected to an element on a page.
 * See Mapper.render() for instantiation.
 * Call disconnect() on a render context once the element is no longer being used for a specific Mapper to close event listeners.
 */
class RenderContext {
	/* Construct the render context for the specified mapper in a specific parent element.
	 * Will set up event listeners and build the initial UI.
	 */
	constructor(parent, mapper) {
		this.parent = parent
		this.mapper = mapper

		// The UI is just a canvas.
		// We will keep its size filling the parent element.
		this.canvas = document.createElement("canvas")
		this.parent.appendChild(this.canvas)

		// The canvas has no extra size.
		this.canvas.style.padding = '0'
		this.canvas.style.margin = '0'
		this.canvas.style.border = '0'

		// Watch the parent resize so we can keep our canvas filling the whole thing.
		this.parentObserver = new ResizeObserver(() => this.recalculateSize())
		this.parentObserver.observe(this.parent)

		this.recalculateSize()
	}

	/* Recalculate the UI size based on the parent.
	 * This requires a full redraw.
	 */
	recalculateSize() {
		// Keep the canvas matching the parent size.
		this.canvas.width = this.parent.clientWidth
		this.canvas.height = this.parent.clientHeight

		this.redraw()
	}

	/* Completely redraw the displayed UI. */
	redraw() {
		var c = this.canvas.getContext("2d")
		c.beginPath()
		c.rect(0, 0, this.canvas.width, this.canvas.height)
		c.fillStyle = "blue"
		c.fill()
	}

	disconnect() {
		this.parentObserver.disconnect()
		this.parent.removeChild(this.canvas);
	}
}

/* Mapper interface
 * A connection to a database and mapper UI.
 * TODO: backend connection
 * Instantiate Mapper and then call the render() method to insert the UI into a div element.
 */
class Mapper {
	/* Set the backend for the mapper, i.e. the map it is presenting.
	 * See: backend.js
	 */
	constructor(backend) {
		this.backend = backend
	}

	/* Render Mapper into a div element
	 * Returns a RenderContext.
	 * Example: const renderContext = mapper.render(document.getElementById("mapper_div"))
	 */
	render(element) {
		return new RenderContext(element, this);
	}
}

export { Mapper }

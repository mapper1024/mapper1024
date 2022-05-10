import { HookContainer } from "./hook_container.js";
import { Point } from "./point.js";
import { asyncFrom } from "./utils.js";

/** A render context of a mapper into a specific element.
 * Handles keeping the UI connected to an element on a page.
 * See Mapper.render() for instantiation.
 * Call disconnect() on a render context once the element is no longer being used for a specific Mapper to close event listeners.
 */
class RenderContext {
	/** Construct the render context for the specified mapper in a specific parent element.
	 * Will set up event listeners and build the initial UI.
	 */
	constructor(parent, mapper) {
		this.parent = parent;
		this.mapper = mapper;

		// The UI is just a canvas.
		// We will keep its size filling the parent element.
		this.canvas = document.createElement("canvas");
		this.parent.appendChild(this.canvas);

		// The canvas has no extra size.
		this.canvas.style.padding = "0";
		this.canvas.style.margin = "0";
		this.canvas.style.border = "0";

		this.mapper.hooks.add("update", () => this.redraw());

		this.canvas.addEventListener("click", async (event) => {
			await this.mapper.insertNode(this.canvasPointToMap(new Point(event.x, event.y)));
		});

		// Watch the parent resize so we can keep our canvas filling the whole thing.
		this.parentObserver = new ResizeObserver(() => this.recalculateSize());
		this.parentObserver.observe(this.parent);

		this.recalculateSize();
	}

	canvasPointToMap(point) {
		return new Point(point.x, point.y, 0);
	}

	mapPointToCanvas(point) {
		return new Point(point.x, point.y);
	}

	/** Recalculate the UI size based on the parent.
	 * This requires a full redraw.
	 */
	recalculateSize() {
		// Keep the canvas matching the parent size.
		this.canvas.width = this.parent.clientWidth;
		this.canvas.height = this.parent.clientHeight;

		this.redraw();
	}

	/** Completely redraw the displayed UI. */
	redraw() {
		var c = this.canvas.getContext("2d");
		c.beginPath();
		c.rect(0, 0, this.canvas.width, this.canvas.height);
		c.fillStyle = "blue";
		c.fill();

		(async () => {
			for await (const nodeRef of this.visibleNodes()) {
				const point = this.mapPointToCanvas(await nodeRef.center());
				c.beginPath();
				c.arc(point.x, point.y, 16, 0, 2 * Math.PI, false);
				c.fillStyle = "green";
				c.fill();

				for await (const dirEdgeRef of this.mapper.getNodeEdges(nodeRef)) {
					const otherNodeRef = await dirEdgeRef.getDirOtherNode();
					const otherPoint = this.mapPointToCanvas(await otherNodeRef.center());
					c.beginPath();
					c.moveTo(point.x, point.y);
					c.lineTo(otherPoint.x, otherPoint.y);
					c.stroke();
				}
			}
		})();
	}

	async * visibleNodes() {
		yield* this.mapper.getNodesInArea(this.canvasPointToMap(new Point(0, 0)), this.canvasPointToMap(new Point(this.canvas.width, this.canvas.height)));
	}

	/** Disconnect the render context from the page and clean up listeners. */
	disconnect() {
		this.parentObserver.disconnect();
		this.parent.removeChild(this.canvas);
	}
}

/** Mapper interface
 * A connection to a database and mapper UI.
 * TODO: backend connection
 * Instantiate Mapper and then call the render() method to insert the UI into a div element.
 */
class Mapper {
	/* Set the backend for the mapper, i.e. the map it is presenting.
	 * See: backend.js
	 */
	constructor(backend) {
		this.backend = backend;
		this.hooks = new HookContainer();

		this.hooks.add("updateNode", () => this.hooks.call("update"));
		this.hooks.add("insertNode", (nodeRef) => this.hooks.call("updateNode", nodeRef));

		this.options = {
			blendDistance: 400,
		};
	}

	async * getNodesInArea(a, b) {
		yield* this.backend.getNodesInArea(a, b);
	}

	async * getNodeEdges(nodeRef) {
		yield* this.backend.getNodeEdges(nodeRef.id);
	}

	/** Render Mapper into a div element
	 * @returns {RenderContext}
	 * Example: const renderContext = mapper.render(document.getElementById("mapper_div"))
	 */
	render(element) {
		return new RenderContext(element, this);
	}

	async insertNode(point) {
		const nodeRef = await this.backend.createNode();
		await nodeRef.setCenter(point);
		await this.connectNode(nodeRef, this.options);
		this.hooks.call("insertNode", nodeRef);
	}

	async connectNode(nodeRef, options) {
		await this.connectNodeToParent(nodeRef);
		await this.connectNodeToAdjacentNodes(nodeRef, options.blendDistance);
		await this.cleanNodeConnectionsAround(nodeRef);
	}

	async connectNodeToParent(nodeRef) {
		// TODO: Parents
		nodeRef;
	}

	async connectNodeToAdjacentNodes(nodeRef, blendDistance) {
		for (const otherNodeRef of await asyncFrom(this.backend.getAdjacentNodes(nodeRef, blendDistance))) {
			await this.backend.createEdge(nodeRef.id, otherNodeRef.id);
		}
	}

	async cleanNodeConnectionsAround(nodeRef) {
		// TODO: Clean up edges
		nodeRef;
	}
}

export { Mapper };

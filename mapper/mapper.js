import { HookContainer } from "./hook_container.js";
import { Vector3, Box3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";

class Brush {
	constructor(context) {
		this.context = context;

		this.size = 1;
		this.maxSize = 10;
	}

	getDescription() {
		throw "description not implemented";
	}

	getRadius() {
		return this.size * 16;
	}

	increment() {
		throw "increment not implemented";
	}

	decrement() {
		throw "decrement not implemented";
	}

	shrink() {
		this.size = Math.max(1, this.size - 1);
	}

	enlarge() {
		this.size = Math.min(this.maxSize, this.size + 1);
	}

	draw(where) {
		where;
		throw "draw not implemented";
	}
}

class NodeBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 1;
		this.nodeTypes = ["water", "grass", "forest", "mountain"];
	}

	getDescription() {
		return `${this.getNodeType()} (size ${this.size})`;
	}

	getNodeType() {
		return this.nodeTypes[this.nodeTypeIndex];
	}

	increment() {
		this.nodeTypeIndex = this.nodeTypeIndex + 1;
		this.wrapIndex();
	}

	decrement() {
		this.nodeTypeIndex = this.nodeTypeIndex - 1;
		this.wrapIndex();
	}

	wrapIndex() {
		const len = this.nodeTypes.length;
		this.nodeTypeIndex = (len == 0) ? -1 : mod(this.nodeTypeIndex, len);
	}

	draw(where) {
		this.context.mapper.insertNode(this.context.canvasPointToMap(where), {
			type: this.getNodeType(),
			radius: this.getRadius(),
		});
	}
}

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

		this.TILE_SIZE = 32;
		this.tiles = {};

		this.pressedKeys = {};
		this.mousePosition = Vector3.ZERO;

		this.brush = new NodeBrush(this);

		// The UI is just a canvas.
		// We will keep its size filling the parent element.
		this.canvas = document.createElement("canvas");
		this.canvas.tabIndex = 1;
		this.parent.appendChild(this.canvas);

		// The canvas has no extra size.
		this.canvas.style.padding = "0";
		this.canvas.style.margin = "0";
		this.canvas.style.border = "0";

		this.mapper.hooks.add("update", () => this.recalculateTiles());

		this.canvas.addEventListener("click", (event) => {
			this.brush.draw(new Vector3(event.x, event.y, 0));
		});

		this.canvas.addEventListener("mousemove", (event) => {
			this.mousePosition = new Vector3(event.x, event.y, 0);
			this.redraw();
		});

		this.canvas.addEventListener("keydown", (event) => {
			this.pressedKeys[event.code] = true;
		});

		this.canvas.addEventListener("keyup", (event) => {
			this.pressedKeys[event.code] = false;
		});

		this.canvas.addEventListener("wheel", (event) => {
			event.preventDefault();

			if(this.isKeyDown("KeyB")) {
				if(event.deltaY < 0) {
					this.brush.increment();
				}
				else {
					this.brush.decrement();
				}
			}
			else if(this.isKeyDown("KeyS")) {
				if(event.deltaY < 0) {
					this.brush.enlarge();
				}
				else {
					this.brush.shrink();
				}
			}

			this.redraw();
		});

		// Watch the parent resize so we can keep our canvas filling the whole thing.
		this.parentObserver = new ResizeObserver(() => this.recalculateSize());
		this.parentObserver.observe(this.parent);

		this.recalculateSize();
	}

	focus() {
		this.canvas.focus();
	}

	isKeyDown(key) {
		return !!this.pressedKeys[key];
	}

	getBrush() {
		return this.brush;
	}

	canvasPointToMap(v) {
		return new Vector3(v.x, v.y, 0);
	}

	mapPointToCanvas(v) {
		return new Vector3(v.x, v.y);
	}

	screenSize() {
		return new Vector3(this.canvas.width, this.canvas.height, 0);
	}

	screenBox() {
		return new Box3(Vector3.ZERO, this.screenSize());
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

	async recalculateTiles() {
		const tiles = {};

		for await (const nodeRef of this.visibleNodes()) {
			const center = await nodeRef.center();
			const centerTile = center.divideScalar(this.TILE_SIZE).round();
			const type = await nodeRef.getPString("type");
			const radius = await nodeRef.getPNumber("radius");
			const radiusTile = Math.ceil(radius / this.TILE_SIZE);

			for(let x = centerTile.x - radiusTile; x <= centerTile.x + radiusTile; x++) {
				if(tiles[x] === undefined) {
					tiles[x] = {};
				}
				const tilesX = tiles[x];
				for(let y = centerTile.y - radiusTile; y <= centerTile.y + radiusTile; y++) {
					if(tilesX[y] === undefined) {
						const corner = new Vector3(x * this.TILE_SIZE, y * this.TILE_SIZE, 0);

						tilesX[y] = {
							point: corner,
							center: corner.add(new Vector3(this.TILE_SIZE / 2, this.TILE_SIZE / 2, 0)),
							closestNodeRef: null,
							closestType: null,
							closestDistance: Infinity,
						};
					}

					const tile = tilesX[y];
					const distance = tile.center.subtract(center).length();
					if(distance <= radius + this.TILE_SIZE / 2 && distance < tile.closestDistance) {
						tile.closestNodeRef = nodeRef;
						tile.closestType = type;
						tile.closestDistance = distance;
					}
				}
			}
		}

		this.tiles = tiles;
		await this.redraw();
	}

	/** Completely redraw the displayed UI. */
	async redraw() {
		var c = this.canvas.getContext("2d");
		c.beginPath();
		c.rect(0, 0, this.canvas.width, this.canvas.height);
		c.fillStyle = "black";
		c.fill();

		const colors = {
			water: "darkblue",
			grass: "lightgreen",
			mountain: "gray",
			forest: "darkgreen",
		};

		const tiles = this.tiles;

		for (const x in tiles) {
			const tilesX = tiles[x];
			for (const y in tilesX) {
				const tile = tilesX[y];

				if(tile.closestNodeRef !== null) {
					c.fillStyle = colors[tile.closestType];
					c.fillRect(tile.point.x, tile.point.y, this.TILE_SIZE, this.TILE_SIZE);
				}
			}
		}

		for await (const nodeRef of this.visibleNodes()) {
			const center = await nodeRef.center();
			const canvasCenter = this.mapPointToCanvas(center);

			c.fillStyle = "white";
			c.beginPath();
			c.arc(canvasCenter.x, canvasCenter.y, 4, 0, 2 * Math.PI, false);
			c.fill();
		}

		// Draw brush
		c.beginPath();
		c.arc(this.mousePosition.x, this.mousePosition.y, this.brush.getRadius(), 0, 2 * Math.PI, false);
		c.strokeStyle = "white";
		c.stroke();

		c.font = "24px sans";
		c.fillStyle = "white";
		c.fillText(this.brush.getDescription(), 24, 24);

		// Debug help
		c.fillText("Click to place terrain; ctrl+click to delete terrain.", 24, (24 + 4) * 2);
		c.fillText("Hold B while scrolling to change brush type; hold S while scrolling to change brush size", 24, (24 + 4) * 3);
	}

	async * visibleNodes() {
		yield* this.mapper.getNodesInArea(this.screenBox().map(this.canvasPointToMap));
	}

	/** Disconnect the render context from the page and clean up listeners. */
	disconnect() {
		this.parentObserver.disconnect();
		this.parent.removeChild(this.canvas);
	}
}

/** Mapper interface
 * A connection to a database and mapper UI.
 * Instantiate Mapper and then call the render() method to insert the UI into a div element.
 */
class Mapper {
	/* Set the backend for the mapper, i.e. the map it is presenting.
	 * See: backend.js
	 */
	constructor(backend) {
		this.backend = backend;
		this.hooks = new HookContainer();

		this.backend.hooks.add("load", () => this.hooks.call("update"));
		this.hooks.add("updateNode", () => this.hooks.call("update"));
		this.hooks.add("insertNode", (nodeRef) => this.hooks.call("updateNode", nodeRef));

		this.options = {
			blendDistance: 400,
			cleanNormalDistance: 0.5,
		};
	}

	/** Get all nodes inside a specified spatial box.
	 * @param box {Box3}
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getNodesInArea(box) {
		yield* this.backend.getNodesInArea(box);
	}

	/** Get all edges attached to the specified node.
	 * @param nodeRef {NodeRef}
	 * @returns {AsyncIterable.<DirEdgeRef>} the edges coming from the specified node
	 */
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

	async insertNode(point, options) {
		const nodeRef = await this.backend.createNode();
		await nodeRef.setCenter(point);
		await nodeRef.setPString("type", options.type);
		await nodeRef.setPNumber("radius", options.radius);
		await this.connectNode(nodeRef, this.options);
		this.hooks.call("insertNode", nodeRef);
	}

	async connectNode(nodeRef, options) {
		await this.connectNodeToParent(nodeRef);
		await this.connectNodeToNearbyNodes(nodeRef, options);
		await this.cleanNodeConnectionsAround(nodeRef, options);
	}

	async connectNodeToParent(nodeRef) {
		// TODO: Parents
		nodeRef;
	}

	async connectNodeToNearbyNodes(nodeRef, options) {
		for (const otherNodeRef of await asyncFrom(this.backend.getNearbyNodes(nodeRef, options.blendDistance))) {
			await this.backend.createEdge(nodeRef.id, otherNodeRef.id);
		}
	}

	async cleanNodeConnectionsAround(nodeRef, options) {
		options;

		const removed = {};

		for (const dirEdgeRef of await asyncFrom(this.backend.getNodeEdges(nodeRef.id))) {
			if(!removed[dirEdgeRef.id]) {
				for (const intersectingEdgeRef of await asyncFrom(this.backend.getIntersectingEdges(dirEdgeRef, options.blendDistance))) {
					if((await dirEdgeRef.getLine()).distanceSquared() < (await intersectingEdgeRef.getLine()).distanceSquared()) {
						intersectingEdgeRef.remove();
						removed[intersectingEdgeRef.id] = true;
					}
					else {
						dirEdgeRef.remove();
						break;
					}
				}
			}
		}
	}
}

export { Mapper };

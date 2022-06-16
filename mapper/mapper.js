import { HookContainer } from "./hook_container.js";
import { Vector3, Box3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";

class Brush {
	constructor(context) {
		this.context = context;

		this.size = 1;
		this.maxSize = 25;
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

	async triggerPrimary(where) {
		where;
	}

	async triggerAlternate(where) {
		where;
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

	async triggerPrimary(where) {
		await this.context.mapper.insertNode(this.context.canvasPointToMap(where), {
			type: this.getNodeType(),
			radius: this.getRadius(),
		});
	}

	async triggerAlternate(where) {
		const toRemove = [];

		for await (const nodeRef of this.context.visibleNodes()) {
			if(this.context.mapPointToCanvas((await nodeRef.center())).subtract(where).length() <= this.getRadius()) {
				toRemove.push(nodeRef);
			}
		}

		this.context.mapper.removeNodes(toRemove);
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
		this.MEGA_TILE_SIZE = 512;
		this.OFF_SCREEN_BUFFER_STRETCH = Vector3.UNIT.multiplyScalar(this.MEGA_TILE_SIZE);
		this.tiles = {};
		this.megaTiles = {};
		this.drawnNodeIds = new Set();
		this.nodeIdToTiles = {};

		this.backgroundColor = "#997";

		this.pressedKeys = {};
		this.pressedMouseButtons = {};
		this.oldMousePosition = Vector3.ZERO;
		this.mousePosition = Vector3.ZERO;

		this.scrollOffset = Vector3.ZERO;

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

		this.mapper.hooks.add("updateNode", (nodeRef) => this.recalculateTilesNodeUpdate(nodeRef));
		this.mapper.hooks.add("removeNodes", (nodeRefs) => this.recalculateTilesNodesRemove(nodeRefs));

		this.canvas.addEventListener("mousedown", async (event) => {
			this.pressedMouseButtons[event.button] = true;
		});

		this.canvas.addEventListener("mouseup", async (event) => {
			const where = new Vector3(event.x, event.y, 0);

			if(event.button === 0) {
				if(this.isKeyDown("KeyD")) {
					await this.brush.triggerAlternate(where);
				} else {
					await this.brush.triggerPrimary(where);
				}
			}

			this.pressedMouseButtons[event.button] = false;
		});

		this.canvas.addEventListener("mousemove", (event) => {
			this.oldMousePosition = this.mousePosition;
			this.mousePosition = new Vector3(event.x, event.y, 0);

			if(this.isMouseButtonDown(2)) {
				this.scrollOffset = this.scrollOffset.add(this.mousePosition.subtract(this.oldMousePosition));
				this.recalculateTilesViewport();
			}
			else {
				this.redraw();
			}
		});

		this.canvas.addEventListener("mouseout", (event) => {
			event;
			this.cancelMouseButtonPresses();
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

	isMouseButtonDown(button) {
		return !!this.pressedMouseButtons[button];
	}

	cancelMouseButtonPresses() {
		this.pressedMouseButtons = {};
	}

	getBrush() {
		return this.brush;
	}

	canvasPointToMap(v) {
		return new Vector3(v.x, v.y, 0).add(this.scrollOffset);
	}

	mapPointToCanvas(v) {
		return new Vector3(v.x, v.y, 0).subtract(this.scrollOffset);
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

	async recalculateTilesViewport() {
		return await this.recalculateTiles([], []);
	}

	async recalculateTilesNodeUpdate(nodeRef) {
		return await this.recalculateTiles([nodeRef], []);
	}

	async recalculateTilesNodesRemove(nodeRefs) {
		return await this.recalculateTiles([], nodeRefs);
	}

	async recalculateTiles(updatedNodeRefs, removedNodeRefs) {
		const actualTiles = [];

		const updatedNodeIds = new Set(updatedNodeRefs.map((nodeRef) => nodeRef.id));
		const removedNodeIds = new Set(removedNodeRefs.map((nodeRef) => nodeRef.id));

		const visibleNodeIds = new Set(await asyncFrom(this.visibleNodes(), (nodeRef) => nodeRef.id));

		for(const nodeId of this.drawnNodeIds) {
			// Small chance to clean up a node that is no longer visible.
			// Save performance by not clearing all off-screen nodes at once.
			if(Math.random() < 0.01 && !visibleNodeIds.has(nodeId)) {
				removedNodeIds.add(nodeId);
			}
		}

		for(const nodeId of visibleNodeIds) {
			if(!this.drawnNodeIds.has(nodeId)) {
				updatedNodeIds.add(nodeId);
			}
		}

		const recheckTiles = {};

		for(const removedId of removedNodeIds) {
			const tX = this.nodeIdToTiles[removedId];
			for(const x in tX) {
				if(recheckTiles[x] === undefined) {
					recheckTiles[x] = {};
				}
				const rX = recheckTiles[x];
				const tY = this.nodeIdToTiles[removedId][x];
				const mtX = this.megaTiles[Math.floor(x / this.MEGA_TILE_SIZE * this.TILE_SIZE)];
				for(const y in tY) {
					rX[y] = tY[y];
					delete this.tiles[x][y];
					if(mtX !== undefined) {
						const megaTilePositionY = Math.floor(y / this.MEGA_TILE_SIZE * this.TILE_SIZE);
						const megaTile = mtX[megaTilePositionY];
						if(megaTile !== undefined && !megaTile.cleared) {
							megaTile.adjacentNodeIds.delete(removedId);
							for(const nodeId of megaTile.adjacentNodeIds) {
								updatedNodeIds.add(nodeId);
							}
							const c = megaTile.canvas.getContext("2d");
							c.beginPath();
							c.rect(0, 0, megaTile.canvas.width, megaTile.canvas.height);
							c.fillStyle = this.backgroundColor;
							c.fill();
							megaTile.cleared = true;
						}
					}
				}
			}
			delete this.nodeIdToTiles[removedId];
			this.drawnNodeIds.delete(removedId);
		}

		for(const x in recheckTiles) {
			const rX = recheckTiles[x];
			for(const y in rX) {
				for(const nodeRef of rX[y].adjacentNodeRefs) {
					updatedNodeIds.add(nodeRef.id);
				}
			}
		}

		for(const nodeId of removedNodeIds) {
			updatedNodeIds.delete(nodeId);
		}

		for(const nodeId of updatedNodeIds) {
			this.drawnNodeIds.add(nodeId);

			const nodeRef = this.mapper.backend.getNodeRef(nodeId);
			if(!nodeRef.exists()) {
				continue;
			}

			if(this.nodeIdToTiles[nodeRef.id] === undefined) {
				this.nodeIdToTiles[nodeRef.id] = {};
			}

			const center = await nodeRef.center();
			const centerTile = center.divideScalar(this.TILE_SIZE).round();
			const type = await nodeRef.getPString("type");
			const radius = await nodeRef.getPNumber("radius");
			const radiusTile = Math.ceil(radius / this.TILE_SIZE);

			for(let x = centerTile.x - radiusTile; x <= centerTile.x + radiusTile; x++) {
				if(this.tiles[x] === undefined) {
					this.tiles[x] = {};
				}
				if(this.nodeIdToTiles[nodeRef.id][x] === undefined) {
					this.nodeIdToTiles[nodeRef.id][x] = {};
				}
				const nodeIdToTileX = this.nodeIdToTiles[nodeRef.id][x];
				const tilesX = this.tiles[x];
				const megaTilePositionX = Math.floor(x / this.MEGA_TILE_SIZE * this.TILE_SIZE);

				if(this.megaTiles[megaTilePositionX] === undefined) {
					this.megaTiles[megaTilePositionX] = {};
				}

				const mtX = this.megaTiles[megaTilePositionX];
				for(let y = centerTile.y - radiusTile; y <= centerTile.y + radiusTile; y++) {
					const megaTilePositionY = Math.floor(y / this.MEGA_TILE_SIZE * this.TILE_SIZE);

					if(mtX[megaTilePositionY] === undefined) {
						const canvas = document.createElement("canvas");
						canvas.width = this.MEGA_TILE_SIZE;
						canvas.height = this.MEGA_TILE_SIZE;

						mtX[megaTilePositionY] = {
							point: new Vector3(megaTilePositionX, megaTilePositionY, 0).multiplyScalar(this.MEGA_TILE_SIZE),
							adjacentNodeIds: new Set(),
							canvas: canvas,
						};
					}

					const megaTile = mtX[megaTilePositionY];
					megaTile.cleared = false;

					if(tilesX[y] === undefined) {
						const corner = new Vector3(x * this.TILE_SIZE, y * this.TILE_SIZE, 0);

						tilesX[y] = {
							point: corner,
							center: corner.add(new Vector3(this.TILE_SIZE / 2, this.TILE_SIZE / 2, 0)),
							adjacentNodeRefs: [],
							adjacentNodeTypes: new Set(),
							adjacentCoreNodeTypes: new Set(),
							edgeBorder: true,
							hasEdgeBorder: false,
							typeBorder: false,
							border: false,
							core: false,
							closestNodeRef: null,
							closestType: null,
							closestDistance: Infinity,
							megaTile: megaTile,
							megaTileInternalPosition: corner.map((v) => mod(v, this.MEGA_TILE_SIZE)),
						};
					}

					const tile = tilesX[y];
					const distance = tile.center.subtract(center).length();

					if(distance <= radius + this.TILE_SIZE / 2) {
						nodeIdToTileX[y] = tile;
						actualTiles.push(tile);

						tile.adjacentNodeRefs.push(nodeRef);
						megaTile.adjacentNodeIds.add(nodeRef.id);
						tile.adjacentNodeTypes.add(type);

						if(distance < tile.closestDistance) {
							const core = distance <= radius / 2;
							tile.core = tile.core || core;
							if(core) {
								tile.adjacentCoreNodeTypes.add(type);
							}
							tile.edgeBorder = tile.edgeBorder && distance + this.TILE_SIZE / 2 >= radius;
							tile.typeBorder = tile.typeBorder || tile.adjacentNodeTypes.size > 1;
							tile.border = tile.edgeBorder || tile.typeBorder;
							tile.closestNodeRef = nodeRef;
							tile.closestType = type;
							tile.closestDistance = distance;
							tile.closestRadius = radius;
						}
					}
				}
			}
		}

		const colors = {
			water: "darkblue",
			grass: "lightgreen",
			mountain: "gray",
			forest: "darkgreen",
		};

		for(const tile of actualTiles) {
			const c = tile.megaTile.canvas.getContext("2d");

			if(tile.border) {
				let possibleColors = [colors[tile.closestType]];

				for(const adjacentType of tile.adjacentCoreNodeTypes) {
					possibleColors.push(colors[adjacentType]);
				}

				if(tile.edgeBorder) {
					possibleColors.push(this.backgroundColor);
				}

				if(tile.typeBorder && !tile.core) {
					for(const adjacentType of tile.adjacentNodeTypes) {
						possibleColors.push(colors[adjacentType]);
					}
				}

				for(let px = tile.megaTileInternalPosition.x; px < tile.megaTileInternalPosition.x + this.TILE_SIZE; px += 4) {
					for(let py = tile.megaTileInternalPosition.y; py < tile.megaTileInternalPosition.y + this.TILE_SIZE; py += 4) {
						c.fillStyle = possibleColors[Math.floor(Math.random() * possibleColors.length)];
						c.fillRect(px, py, 4, 4);
					}
				}
			}
			else {
				c.fillStyle = colors[tile.closestType];
				c.fillRect(tile.megaTileInternalPosition.x, tile.megaTileInternalPosition.y, this.TILE_SIZE, this.TILE_SIZE);
			}
		}

		await this.redraw();
	}

	/** Completely redraw the displayed UI. */
	async redraw() {
		const c = this.canvas.getContext("2d");
		c.beginPath();
		c.rect(0, 0, this.canvas.width, this.canvas.height);
		c.fillStyle = this.backgroundColor;
		c.fill();

		const tiles = this.megaTiles;

		for (const x in tiles) {
			const tilesX = tiles[x];
			for (const y in tilesX) {
				const tile = tilesX[y];
				const point = tile.point.subtract(this.scrollOffset);

				c.drawImage(tile.canvas, point.x, point.y);
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
		c.fillText("Left click to place terrain; hold D to delete while clicking.", 24, (24 + 4) * 2);
		c.fillText("Hold B while scrolling to change brush type; hold S while scrolling to change brush size", 24, (24 + 4) * 3);
		c.fillText("Right click to move map.", 24, (24 + 4) * 4);
	}

	async * visibleNodes() {
		const screenBox = this.screenBox();
		const stretchBox = new Box3(screenBox.a.subtract(this.OFF_SCREEN_BUFFER_STRETCH), screenBox.b.add(this.OFF_SCREEN_BUFFER_STRETCH));
		yield* this.mapper.getNodesInArea(stretchBox.map((v) => this.canvasPointToMap(v)));
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

		this.backend.hooks.add("load", async () => await this.hooks.call("update"));
		this.hooks.add("updateNode", async () => await this.hooks.call("update"));
		this.hooks.add("insertNode", async (nodeRef) => await this.hooks.call("updateNode", nodeRef));
		this.hooks.add("removeNodes", async () => await this.hooks.call("update"));

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
		// TODO: connect nodes
		//await this.connectNode(nodeRef, this.options);
		await this.hooks.call("insertNode", nodeRef);
	}

	async removeNodes(nodeRefs) {
		await this.hooks.call("removeNodes", nodeRefs);
		for(const nodeRef of nodeRefs) {
			await nodeRef.remove();
		}
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

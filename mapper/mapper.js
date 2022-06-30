import { HookContainer } from "./hook_container.js";
import { Vector3, Box3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";
import { DeleteBrush, AddBrush, SelectBrush } from "./brushes/index.js";
import { PanEvent } from "./drag_events/index.js";
import { Selection } from "./selection.js";

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

		this.wantRedraw = true;

		this.recalculateViewport = true;
		this.recalculateUpdate = [];
		this.recalculateRemoved = [];
		this.recalculateTranslated = [];

		this.wantRecheckSelection = true;
		this.wantUpdateSelection = true;

		this.undoStack = [];
		this.redoStack = [];

		this.TILE_SIZE = 32;
		this.MEGA_TILE_SIZE = 512;
		this.OFF_SCREEN_BUFFER_STRETCH = Vector3.UNIT.multiplyScalar(this.MEGA_TILE_SIZE);
		this.tiles = {};
		this.megaTiles = {};
		this.drawnNodeIds = new Set();
		this.nodeIdToTiles = {};

		this.backgroundColor = "#997";

		this.pressedKeys = {};
		this.mouseDragEvents = {};
		this.oldMousePosition = Vector3.ZERO;
		this.mousePosition = Vector3.ZERO;

		this.scrollOffset = Vector3.ZERO;

		this.brush = new AddBrush(this);

		this.hoverSelection = new Selection(this, []);
		this.selection = new Selection(this, []);

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
		this.mapper.hooks.add("translateNodes", (nodeRefs) => this.recalculateTilesNodesTranslate(nodeRefs));
		this.mapper.hooks.add("update", this.requestUpdateSelection.bind(this));

		this.canvas.addEventListener("mousedown", async (event) => {
			if(this.mouseDragEvents[event.button] === undefined) {
				const where = new Vector3(event.x, event.y, 0);

				if(event.button === 0) {
					const dragEvent = await this.brush.activate(where);
					if(dragEvent) {
						this.mouseDragEvents[event.button] = dragEvent;
					}
				}
				else if(event.button === 2) {
					if(this.mouseDragEvents[0] !== undefined) {
						this.cancelMouseButtonPress(0);
					}
					else {
						this.mouseDragEvents[event.button] = new PanEvent(this, where);
					}
				}
			}
		});

		this.canvas.addEventListener("mouseup", async (event) => {
			const where = new Vector3(event.x, event.y, 0);

			this.endMouseButtonPress(event.button, where);
		});

		this.canvas.addEventListener("mousemove", (event) => {
			this.oldMousePosition = this.mousePosition;
			this.mousePosition = new Vector3(event.x, event.y, 0);

			for(const button in this.mouseDragEvents) {
				const mouseDragEvent = this.mouseDragEvents[button];
				mouseDragEvent.next(this.mousePosition);
			}

			this.requestRecheckSelection();
			this.requestRedraw();
		});

		this.canvas.addEventListener("mouseout", (event) => {
			event;
			this.cancelMouseButtonPresses();
		});

		this.canvas.addEventListener("keydown", async (event) => {
			this.pressedKeys[event.key] = true;
			if(event.key === "z") {
				const undo = this.undoStack.pop();
				if(undo !== undefined) {
					this.redoStack.push(await this.performAction(undo, false));
				}
			}
			else if(event.key === "y") {
				const redo = this.redoStack.pop();
				if(redo !== undefined) {
					this.pushUndo(await this.performAction(redo, false), true);
				}
			}
			else if(event.key === "d") {
				this.changeBrush(new DeleteBrush(this));
			}
			else if(event.key === "a") {
				this.changeBrush(new AddBrush(this));
			}
			else if(event.key === "s") {
				this.changeBrush(new SelectBrush(this));
			}
			this.requestRedraw();
		});

		this.canvas.addEventListener("keyup", (event) => {
			this.pressedKeys[event.key] = false;
			this.requestRedraw();
		});

		this.canvas.addEventListener("wheel", (event) => {
			event.preventDefault();

			if(this.isKeyDown("q")) {
				if(event.deltaY < 0) {
					this.brush.increment();
				}
				else {
					this.brush.decrement();
				}
			}
			else if(this.isKeyDown("w")) {
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

		setTimeout(this.redrawLoop.bind(this), 10);
		setTimeout(this.recalculateLoop.bind(this), 10);
		setTimeout(this.recalculateSelection.bind(this), 10);
	}

	changeBrush(brush) {
		this.brush = brush;
		this.requestRedraw();
	}

	async redrawLoop() {
		if(this.wantRedraw) {
			this.wantRedraw = false;
			await this.redraw();
		}
		setTimeout(this.redrawLoop.bind(this), 10);
	}

	async recalculateSelection() {
		if(this.wantRecheckSelection) {
			this.wantRecheckSelection = false;
			const closestNodeRef = await this.getClosestNodeRef(this.mousePosition);
			if(closestNodeRef) {
				this.hoverSelection = await Selection.fromNodeRefs(this, [closestNodeRef]);
			}
			else {
				this.hoverSelection = new Selection(this, []);
			}
		}
		if(this.wantUpdateSelection) {
			this.wantUpdateSelection = false;
			await this.hoverSelection.update();
			await this.selection.update();
			this.requestRedraw();
		}
		setTimeout(this.recalculateSelection.bind(this), 10);
	}

	async getClosestNodeRef(canvasPosition) {
		let closestNodeRef = null;
		let closestDistanceSquared = null;
		for await (const nodeRef of this.drawnNodes()) {
			const center = this.mapPointToCanvas(await nodeRef.center());
			const distanceSquared = center.subtract(canvasPosition).lengthSquared();
			if(distanceSquared < (await nodeRef.getPNumber("radius")) ** 2 && (!closestDistanceSquared || distanceSquared <= closestDistanceSquared)) {
				closestNodeRef = nodeRef;
				closestDistanceSquared = distanceSquared;
			}
		}
		return closestNodeRef;
	}

	async recalculateLoop() {
		if(this.recalculateViewport || this.recalculateUpdate.length > 0 || this.recalculateRemoved.length > 0 || this.recalculateTranslated.length > 0) {
			this.recalculateViewport = false;
			await this.recalculateTiles(this.recalculateUpdate.splice(0, this.recalculateUpdate.length), this.recalculateRemoved.splice(0, this.recalculateRemoved.length), this.recalculateTranslated.splice(0, this.recalculateTranslated.length));
		}
		setTimeout(this.recalculateLoop.bind(this), 10);
	}

	async performAction(action, addToUndoStack) {
		const undo = await action.perform();
		if(addToUndoStack) {
			this.pushUndo(undo);
		}
		return undo;
	}

	hoveringOverSelection() {
		return this.selection.exists() && this.hoverSelection.exists() && this.selection.contains(this.hoverSelection);
	}

	pushUndo(action, fromRedo) {
		if(!action.empty()) {
			this.undoStack.push(action);
			if(!fromRedo) {
				this.redoStack = [];
			}
		}
	}

	requestRecheckSelection() {
		this.wantRecheckSelection = true;
	}

	requestUpdateSelection() {
		this.wantRecheckSelection = true;
	}

	requestRedraw() {
		this.wantRedraw = true;
	}

	focus() {
		this.canvas.focus();
	}

	isKeyDown(key) {
		return !!this.pressedKeys[key];
	}

	isMouseButtonDown(button) {
		return !!this.mouseDragEvents[button];
	}

	endMouseButtonPress(button, where) {
		if(this.mouseDragEvents[button] !== undefined) {
			this.mouseDragEvents[button].end(where);
			delete this.mouseDragEvents[button];
		}
	}

	cancelMouseButtonPress(button) {
		if(this.mouseDragEvents[button] !== undefined) {
			this.mouseDragEvents[button].cancel();
			delete this.mouseDragEvents[button];
			this.requestRedraw();
		}
	}

	cancelMouseButtonPresses() {
		for(const button in this.mouseDragEvents) {
			this.cancelMouseButtonPress(button);
		}
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

	recalculateTilesViewport() {
		this.recalculateViewport = true;
	}

	recalculateTilesNodeUpdate(nodeRef) {
		this.recalculateUpdate.push(nodeRef);
	}

	recalculateTilesNodesRemove(nodeRefs) {
		this.recalculateRemoved.push(...nodeRefs);
	}

	recalculateTilesNodesTranslate(nodeRefs) {
		this.recalculateTranslated.push(...nodeRefs);
	}

	async recalculateTiles(updatedNodeRefs, removedNodeRefs, translatedNodeRefs) {
		const actualTiles = [];

		const updatedNodeIds = new Set([...updatedNodeRefs, ...translatedNodeRefs].map((nodeRef) => nodeRef.id));
		const removedNodeIds = new Set(removedNodeRefs.map((nodeRef) => nodeRef.id));
		const translatedNodeIds = new Set(translatedNodeRefs.map((nodeRef) => nodeRef.id));

		const visibleNodeIds = new Set(await asyncFrom(this.visibleNodes(), (nodeRef) => nodeRef.id));

		for(const nodeId of this.drawnNodeIds) {
			if(!visibleNodeIds.has(nodeId)) {
				removedNodeIds.add(nodeId);
			}
		}

		for(const nodeId of visibleNodeIds) {
			if(!this.drawnNodeIds.has(nodeId)) {
				updatedNodeIds.add(nodeId);
			}
		}

		const recheckTiles = {};

		for(const removedId of new Set([...removedNodeIds, ...translatedNodeIds])) {
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
						if(megaTile !== undefined) {
							megaTile.adjacentNodeIds.delete(removedId);
							if(!megaTile.cleared) {
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

			if(this.nodeIdToTiles[nodeRef.id] === undefined) {
				this.nodeIdToTiles[nodeRef.id] = {};
			}

			const center = await nodeRef.center();
			const centerTile = center.divideScalar(this.TILE_SIZE).round();
			const type = await nodeRef.getPString("type");
			const radius = await nodeRef.getPNumber("radius");
			if(radius > 0) {
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

		this.requestRedraw();
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

		const toDraw = {};

		for await (const nodeRef of this.drawnNodes()) {
			const inSelection = this.selection.hasNodeRef(nodeRef);
			const inHoverSelection = this.hoverSelection.hasNodeRef(nodeRef);
			const sibling = this.hoverSelection.nodeRefIsSibling(nodeRef) || this.selection.nodeRefIsSibling(nodeRef);
			const notSibling = (inSelection && !this.selection.nodeRefIsSibling(nodeRef)) || (inHoverSelection && !this.hoverSelection.nodeRefIsSibling(nodeRef));
			const alpha = (sibling && !notSibling) ? 0.25 : 0.75;

			if(inSelection || inHoverSelection) {
				const nodeTiles = this.nodeIdToTiles[nodeRef.id];
				if(nodeTiles !== undefined) {
					for(const x in nodeTiles) {
						const tX = nodeTiles[x];
						if(toDraw[x] === undefined) {
							toDraw[x] = new Set();
						}
						const tDX = toDraw[x];
						for(const y in tX) {
							if(tDX[y] === undefined) {
								tDX[y] = {
									tile: tX[y],
									alpha: alpha,
								};
							}
							else {
								tDX[y].alpha = Math.max(tDX[y].alpha, alpha);
							}
							tDX[y].inSelection = tDX[y].inSelection || inSelection;
							tDX[y].inHoverSelection = tDX[y].inHoverSelection || inHoverSelection;
						}
					}
				}
			}

			c.globalAlpha = 1;
		}

		for(const x in toDraw) {
			const tX = toDraw[x];
			for(const y in tX) {
				const t = tX[y];
				const point = this.mapPointToCanvas(t.tile.point);
				c.globalAlpha = t.alpha;
				c.strokeStyle = "white";
				if(t.inHoverSelection) {
					c.strokeRect(point.x, point.y, this.TILE_SIZE, this.TILE_SIZE);
				}
				if(t.inSelection) {
					c.strokeRect(point.x + 2, point.y + 2, this.TILE_SIZE - 2, this.TILE_SIZE - 2);
				}
			}
		}

		c.globalAlpha = 1;

		await this.brush.draw(this.canvas.getContext("2d"), this.mousePosition);

		c.font = "18px sans";
		c.fillStyle = "white";

		let infoLineY = 18;
		function infoLine(l) {
			c.fillText(l, 18, infoLineY);
			infoLineY += 24;
		}

		infoLine(`Brush: ${this.brush.getDescription()}`);

		// Debug help
		infoLine("Change brush mode with (A)dd, (S)elect or (D)elete.");
		if(this.brush instanceof AddBrush) {
			infoLine("Click to add terrain");
			infoLine("Hold Q while scrolling to change brush type; hold W while scrolling to change brush size.");
		}
		else if(this.brush instanceof SelectBrush) {
			infoLine("Click to select, drag to move.");
			infoLine("Hold Shift to select an entire object, hold Control to add to an existing selection.");
		}
		else if(this.brush instanceof DeleteBrush) {
			infoLine("Click to delete. Hold Shift to delete an entire object.");
			infoLine("Hold Control to delete all objects inside the brush. Hold W while scrolling to change brush size.");
		}
		infoLine("Right click to move map. Ctrl+Z is undo, Ctrl+Y is redo.");
	}

	async * visibleNodes() {
		const screenBox = this.screenBox();
		const stretchBox = new Box3(screenBox.a.subtract(this.OFF_SCREEN_BUFFER_STRETCH), screenBox.b.add(this.OFF_SCREEN_BUFFER_STRETCH));
		yield* this.mapper.getNodesInArea(stretchBox.map((v) => this.canvasPointToMap(v)));
	}

	async * drawnNodes() {
		for(const nodeId of this.drawnNodeIds) {
			yield this.mapper.backend.getNodeRef(nodeId);
		}
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
		this.hooks.add("translateNodes", async () => await this.hooks.call("update"));

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
		const nodeRef = await this.backend.createNode(options.parent ? options.parent.id : null);
		await nodeRef.setCenter(point);
		await nodeRef.setPString("type", options.type);
		await nodeRef.setPNumber("radius", options.radius);
		// TODO: connect nodes
		//await this.connectNode(nodeRef, this.options);
		await this.hooks.call("insertNode", nodeRef);
		return nodeRef;
	}

	async translateNode(originNodeRef, offset) {
		const nodeRefs = await asyncFrom(originNodeRef.getSelfAndAllDescendants());
		for(const nodeRef of nodeRefs) {
			await nodeRef.setCenter((await nodeRef.center()).add(offset));
		}
		await this.hooks.call("translateNodes", nodeRefs);
	}

	async removeNodes(nodeRefs) {
		let nodeIds = new Set(nodeRefs.map((nodeRef) => nodeRef.id));
		for(const nodeRef of nodeRefs) {
			for await (const childNodeRef of nodeRef.getAllDescendants()) {
				nodeIds.add(childNodeRef.id);
			}
		}

		const nodeRefsWithChildren = Array.from(nodeIds, (nodeId) => this.backend.getNodeRef(nodeId));

		await this.hooks.call("removeNodes", nodeRefsWithChildren);
		for(const nodeRef of nodeRefsWithChildren) {
			await nodeRef.remove();
		}

		return nodeRefsWithChildren;
	}

	async unremoveNodes(nodeRefs) {
		for(const nodeRef of nodeRefs) {
			await nodeRef.unremove();
			await this.hooks.call("insertNode", nodeRef);
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

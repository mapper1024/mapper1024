import { HookContainer } from "./hook_container.js";
import { Vector3, Box3 } from "./geometry.js";
import { asyncFrom } from "./utils.js";
import { DeleteBrush, AddBrush, SelectBrush } from "./brushes/index.js";
import { PanEvent } from "./drag_events/index.js";
import { Selection } from "./selection.js";
import { Tile, MegaTile } from "./tile.js";

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

		this.keyboardShortcuts = [];

		this.wantRedraw = true;

		this.recalculateViewport = true;
		this.recalculateUpdate = [];
		this.recalculateRemoved = [];
		this.recalculateTranslated = [];

		this.wantRecheckSelection = true;
		this.wantUpdateSelection = true;

		this.undoStack = [];
		this.redoStack = [];

		this.OFF_SCREEN_BUFFER_STRETCH = Vector3.UNIT.multiplyScalar(MegaTile.SIZE);
		this.tiles = {};
		this.megaTiles = {};
		this.drawnNodeIds = new Set();
		this.nodeIdToTiles = {};

		this.backgroundColor = "#997";

		this.pressedKeys = {};
		this.mouseDragEvents = {};
		this.oldMousePosition = Vector3.ZERO;
		this.mousePosition = Vector3.ZERO;

		this.debugMode = false;

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
			for(const shortcut of this.keyboardShortcuts) {
				if(shortcut.filter(this, event)) {
					if(await shortcut.handler() !== true) {
						return;
					}
				}
			}
			if(this.isKeyDown("Control")) {
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
				else if(event.key === "c") {
					this.scrollOffset = Vector3.ZERO;
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
			else if(event.key === "`") {
				this.debugMode = !this.debugMode;
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

	registerKeyboardShortcut(filter, handler) {
		this.keyboardShortcuts.push({
			filter: filter,
			handler: handler,
		});
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
			const center = this.mapPointToCanvas(await nodeRef.getCenter());
			const distanceSquared = center.subtract(canvasPosition).lengthSquared();
			if((!closestDistanceSquared || distanceSquared <= closestDistanceSquared) && distanceSquared < (await nodeRef.getRadius()) ** 2) {
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
				const mtX = this.megaTiles[Math.floor(x / MegaTile.SIZE * Tile.SIZE)];
				for(const y in tY) {
					rX[y] = tY[y];
					delete this.tiles[x][y];
					if(mtX !== undefined) {
						const megaTilePositionY = Math.floor(y / MegaTile.SIZE * Tile.SIZE);
						const megaTile = mtX[megaTilePositionY];
						if(megaTile !== undefined) {
							megaTile.removeNode(removedId);
							for(const nodeId of megaTile.popRedraw()) {
								updatedNodeIds.add(nodeId);
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
				for(const nodeRef of rX[y].getNearbyNodes()) {
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

			const center = await nodeRef.getCenter();
			const centerTile = center.divideScalar(Tile.SIZE).round();
			const radius = await nodeRef.getRadius();
			if(radius > 0) {
				const radiusTile = Math.ceil(radius / Tile.SIZE);

				for(let x = centerTile.x - radiusTile; x <= centerTile.x + radiusTile; x++) {
					if(this.tiles[x] === undefined) {
						this.tiles[x] = {};
					}
					if(this.nodeIdToTiles[nodeRef.id][x] === undefined) {
						this.nodeIdToTiles[nodeRef.id][x] = {};
					}
					const nodeIdToTileX = this.nodeIdToTiles[nodeRef.id][x];
					const tilesX = this.tiles[x];
					const megaTilePositionX = Math.floor(x / MegaTile.SIZE * Tile.SIZE);

					if(this.megaTiles[megaTilePositionX] === undefined) {
						this.megaTiles[megaTilePositionX] = {};
					}

					const mtX = this.megaTiles[megaTilePositionX];
					for(let y = centerTile.y - radiusTile; y <= centerTile.y + radiusTile; y++) {
						const megaTilePositionY = Math.floor(y / MegaTile.SIZE * Tile.SIZE);

						if(mtX[megaTilePositionY] === undefined) {
							mtX[megaTilePositionY] = new MegaTile(this, new Vector3(megaTilePositionX, megaTilePositionY, 0).multiplyScalar(MegaTile.SIZE));
						}

						const megaTile = mtX[megaTilePositionY];

						if(tilesX[y] === undefined) {
							tilesX[y] = megaTile.makeTile(new Vector3(x * Tile.SIZE, y * Tile.SIZE, 0));
						}

						const tile = tilesX[y];

						if(await tile.addNode(nodeRef)) {
							nodeIdToTileX[y] = tile;
							actualTiles.push(tile);
						}
					}
				}
			}
		}

		for(const tile of actualTiles) {
			await tile.render();
		}

		this.requestRedraw();
	}

	async drawTiles() {
		const c = this.canvas.getContext("2d");
		const tiles = this.megaTiles;

		for (const x in tiles) {
			const tilesX = tiles[x];
			for (const y in tilesX) {
				const tile = tilesX[y];
				const point = tile.point.subtract(this.scrollOffset);

				c.drawImage(tile.canvas, point.x, point.y);
			}
		}
	}

	async drawSelection() {
		const c = this.canvas.getContext("2d");
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
				const point = this.mapPointToCanvas(t.tile.corner);
				c.globalAlpha = t.alpha;
				c.strokeStyle = "white";
				if(t.inHoverSelection) {
					c.strokeRect(point.x, point.y, Tile.SIZE, Tile.SIZE);
				}
				if(t.inSelection) {
					c.strokeRect(point.x + 2, point.y + 2, Tile.SIZE - 2, Tile.SIZE - 2);
				}
			}
		}

		c.globalAlpha = 1;
	}

	async drawBrush() {
		await this.brush.draw(this.canvas.getContext("2d"), this.mousePosition);
	}

	async clearCanvas() {
		const c = this.canvas.getContext("2d");
		c.beginPath();
		c.rect(0, 0, this.canvas.width, this.canvas.height);
		c.fillStyle = this.backgroundColor;
		c.fill();
	}

	async drawHelp() {
		const c = this.canvas.getContext("2d");
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
		infoLine("Right click to move map. Ctrl+C to return to center. Ctrl+Z is undo, Ctrl+Y is redo.");
		infoLine("Ctrl+O to open, Ctrl+S to save, Ctrl+Shift+S to save as, ` to toggle debug mode.");
	}

	async drawDebug() {
		const c = this.canvas.getContext("2d");
		for await (const nodeRef of this.drawnNodes()) {
			const position = this.mapPointToCanvas(await nodeRef.getCenter());
			c.beginPath();
			c.arc(position.x, position.y, 4, 0, 2 * Math.PI, false);
			c.strokeStyle = "white";
			c.stroke();
		}
	}

	/** Completely redraw the displayed UI. */
	async redraw() {
		await this.clearCanvas();

		await this.drawTiles();
		await this.drawSelection();
		await this.drawBrush();

		await this.drawHelp();

		if(this.debugMode) {
			await this.drawDebug();
		}
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

		this.hooks.add("update", () => { this.declareUnsavedChanges(); });

		this.options = {
			blendDistance: 400,
			cleanNormalDistance: 0.5,
		};

		this.unsavedChanges = false;
	}

	clearUnsavedChangeState() {
		this.unsavedChanges = false;
		this.hooks.call("unsavedStateChange", false);
	}

	declareUnsavedChanges() {
		this.unsavedChanges = true;
		this.hooks.call("unsavedStateChange", true);
	}

	hasUnsavedChanges() {
		return this.unsavedChanges;
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
		await nodeRef.setType(options.type);
		await nodeRef.setRadius(options.radius);
		// TODO: connect nodes
		//await this.connectNode(nodeRef, this.options);
		await this.hooks.call("insertNode", nodeRef);
		return nodeRef;
	}

	async translateNode(originNodeRef, offset) {
		const nodeRefs = await asyncFrom(originNodeRef.getSelfAndAllDescendants());
		for(const nodeRef of nodeRefs) {
			await nodeRef.setCenter((await nodeRef.getCenter()).add(offset));
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

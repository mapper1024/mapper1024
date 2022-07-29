import { HookContainer } from "./hook_container.js";
import { Vector3, Box3, Line3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";
import { DeleteBrush, AddBrush, SelectBrush } from "./brushes/index.js";
import { PanEvent } from "./drag_events/index.js";
import { Selection } from "./selection.js";
import { Tile, MegaTile } from "./tile.js";
import { ChangeNameAction } from "./actions/index.js";

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

		this.hooks = new HookContainer();
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

		this.tiles = {};
		this.megaTiles = {};
		this.drawnNodeIds = new Set();
		this.offScreenDrawnNodeIds = new Set();
		this.drawnTiles = [];
		this.nodeIdToTiles = {};

		this.backgroundColor = "#997";

		this.pressedKeys = {};
		this.mouseDragEvents = {};
		this.oldMousePosition = Vector3.ZERO;
		this.mousePosition = Vector3.ZERO;

		this.debugMode = false;

		this.scrollOffset = Vector3.ZERO;
		this.zoom = 5;
		this.requestedZoom = 5;

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

		this.canvas.addEventListener("contextmenu", event => {
			event.preventDefault();
		});

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
					this.setScrollOffset(Vector3.ZERO);
					this.requestZoomChange(5);
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
			else if(event.key === "n") {
				const nodeRef = await this.hoverSelection.getParent();
				if(nodeRef) {
					const where = await this.getNamePosition(nodeRef);

					const input = document.createElement("input");
					input.value = (await nodeRef.getPString("name")) || "";

					input.style.position = "absolute";
					input.style.left = `${where.x}px`;
					input.style.top = `${where.y}px`;
					input.style.fontSize = "16px";

					const cancel = () => {
						input.removeEventListener("blur", cancel);
						input.remove();
						this.focus();
					};

					const submit = async () => {
						this.performAction(new ChangeNameAction(this, {nodeRef: nodeRef, name: input.value}), true);
						cancel();
					};

					input.addEventListener("blur", cancel);

					input.addEventListener("keyup", (event) => {
						if(event.key === "Escape") {
							cancel();
						}
						else if(event.key === "Enter") {
							submit();
						}
						event.preventDefault();
					});

					this.parent.appendChild(input);
					input.focus();
					event.preventDefault();
				}
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
			else {
				this.requestZoomChange(this.zoom + (event.deltaY < 0 ? -1 : 1));
			}

			this.requestRedraw();
		});

		// Watch the parent resize so we can keep our canvas filling the whole thing.
		this.parentObserver = new ResizeObserver(() => this.recalculateSize());
		this.parentObserver.observe(this.parent);

		this.recalculateSize();

		setTimeout(this.redrawLoop.bind(this), 10);
		setTimeout(this.recalculateLoop.bind(this), 10);
		setTimeout(this.recalculateSelection.bind(this), 10);
		setTimeout(this.applyZoom.bind(this), 10);
	}

	setScrollOffset(value) {
		this.scrollOffset = value;
		this.recalculateTilesViewport();
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

	async getNamePosition(nodeRef) {
		const optimal = (await nodeRef.getCenter()).map((v) => this.unitsToPixels(v));
		let best = null;

		const selection = await Selection.fromNodeRefs(this, [nodeRef]);

		for(const tile of this.drawnTiles) {
			if(tile.closestNodeRef && selection.hasNodeRef(tile.closestNodeRef)) {
				if(!best || tile.getCenter().subtract(optimal).lengthSquared() < best.subtract(optimal).lengthSquared()) {
					best = tile.getCenter();
				}
			}
		}

		return (best || optimal).subtract(this.scrollOffset);
	}

	requestZoomChange(zoom) {
		this.requestedZoom = Math.max(1, Math.min(zoom, 20));
	}

	async applyZoom() {
		if(this.zoom !== this.requestedZoom) {
			asyncFrom(this.drawnNodes()).then((drawnNodes) => {
				const oldLandmark = this.canvasPointToMap(this.mousePosition);
				this.zoom = this.requestedZoom;
				const newLandmark = this.canvasPointToMap(this.mousePosition);
				this.scrollOffset = this.scrollOffset.add(this.mapPointToCanvas(oldLandmark).subtract(this.mapPointToCanvas(newLandmark)));
				this.recalculateTilesNodesTranslate(drawnNodes);
			});
		}
		setTimeout(this.applyZoom.bind(this), 10);
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
			if((!closestDistanceSquared || distanceSquared <= closestDistanceSquared) && distanceSquared < this.unitsToPixels(await nodeRef.getRadius()) ** 2) {
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
		setTimeout(this.recalculateLoop.bind(this), 100);
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
		return new Vector3(v.x, v.y, 0).add(this.scrollOffset).map((a) => this.pixelsToUnits(a));
	}

	mapPointToCanvas(v) {
		return new Vector3(v.x, v.y, 0).map((a) => this.unitsToPixels(a)).subtract(this.scrollOffset);
	}

	canvasPathToMap(path) {
		return path.mapOrigin((origin) => this.canvasPointToMap(origin)).mapLines((v) => v.map((a) => this.pixelsToUnits(a)));
	}

	pixelsToUnits(pixels) {
		return pixels * this.zoom;
	}

	unitsToPixels(units) {
		return units / this.pixelsToUnits(1);
	}

	screenSize() {
		return new Vector3(this.canvas.width, this.canvas.height, 0);
	}

	screenBox() {
		return new Box3(Vector3.ZERO, this.screenSize());
	}

	screenBoxTiles() {
		const offsetScreenBox = this.screenBox().map((v) => v.add(this.scrollOffset));
		return new Box3(offsetScreenBox.a.map((c) => Math.floor(c / Tile.SIZE)), offsetScreenBox.b.map((c) => Math.ceil(c / Tile.SIZE)));
	}

	/** Recalculate the UI size based on the parent.
	 * This requires a full redraw.
	 */
	recalculateSize() {
		// Keep the canvas matching the parent size.
		this.canvas.width = this.parent.clientWidth;
		this.canvas.height = this.parent.clientHeight;

		this.requestRedraw();
	}

	recalculateTilesViewport() {
		//this.recalculateViewport = true;
		asyncFrom(this.visibleNodes()).then((nodes) => {
			this.recalculateTranslated.push(...(nodes.filter(nodeRef => !this.drawnNodeIds.has(nodeRef.id) || this.offScreenDrawnNodeIds.has(nodeRef.id))));
		});
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
		const actualTiles = new Set();

		const updatedNodeIds = new Set([...updatedNodeRefs, ...translatedNodeRefs].map((nodeRef) => nodeRef.id));
		const removedNodeIds = new Set(removedNodeRefs.map((nodeRef) => nodeRef.id));
		const translatedNodeIds = new Set(translatedNodeRefs.map((nodeRef) => nodeRef.id));

		const visibleNodeIds = new Set(await asyncFrom(this.visibleNodes(), (nodeRef) => nodeRef.id));

		const screenBoxTiles = this.screenBoxTiles();

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

		const clearNodeTiles = (nodeId) => {
			const tX = this.nodeIdToTiles[nodeId];
			for(const x in tX) {
				const withinX = x >= screenBoxTiles.a.x && x <= screenBoxTiles.b.x;
				if(recheckTiles[x] === undefined) {
					recheckTiles[x] = {};
				}
				const rX = recheckTiles[x];
				const tY = this.nodeIdToTiles[nodeId][x];
				const mtX = this.megaTiles[Math.floor(x / MegaTile.SIZE * Tile.SIZE)];
				for(const y in tY) {
					const withinY = y >= screenBoxTiles.a.y && y <= screenBoxTiles.b.y;
					rX[y] = tY[y];
					delete this.tiles[x][y];
					if(mtX !== undefined) {
						const megaTilePositionY = Math.floor(y / MegaTile.SIZE * Tile.SIZE);
						const megaTile = mtX[megaTilePositionY];
						if(megaTile !== undefined) {
							megaTile.removeNode(nodeId);
							for(const nodeId of megaTile.popRedraw()) {
								if(withinX && withinY) {
									updatedNodeIds.add(nodeId);
								}
							}
						}
					}
				}
			}
		};

		for(const removedId of new Set([...removedNodeIds, ...translatedNodeIds])) {
			clearNodeTiles(removedId);
			delete this.nodeIdToTiles[removedId];
			this.drawnNodeIds.delete(removedId);
			this.offScreenDrawnNodeIds.delete(removedId);
		}

		for(const x in recheckTiles) {
			const rX = recheckTiles[x];
			for(const y in rX) {
				for(const nodeRef of rX[y].getNearbyNodes()) {
					updatedNodeIds.add(nodeRef.id);
				}
			}
		}

		for(const nodeId of updatedNodeIds) {
			clearNodeTiles(nodeId);
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

			const center = (await nodeRef.getCenter()).map((a) => this.unitsToPixels(a));
			const centerTile = center.divideScalar(Tile.SIZE).round();
			const radius = this.unitsToPixels(await nodeRef.getRadius());
			if(radius > 0) {
				const radiusTile = Math.ceil(radius / Tile.SIZE);

				const cxn = centerTile.x - radiusTile;
				const cyn = centerTile.y - radiusTile;
				const cxp = centerTile.x + radiusTile;
				const cyp = centerTile.y + radiusTile;

				const tileBox = new Box3(
					new Vector3(Math.max(screenBoxTiles.a.x, cxn), Math.max(screenBoxTiles.a.y, cyn), 0),
					new Vector3(Math.min(screenBoxTiles.b.x, cxp), Math.min(screenBoxTiles.b.y, cyp), 0)
				);

				if(tileBox.a.x !== cxn || tileBox.a.y !== cyn || tileBox.b.x !== cxp || tileBox.b.y !== cyp) {
					this.offScreenDrawnNodeIds.add(nodeId);
				}

				for(let x = tileBox.a.x; x <= tileBox.b.x; x++) {
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
					for(let y = tileBox.a.y; y <= tileBox.b.y; y++) {
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
							actualTiles.add(tile);
						}
					}
				}
			}
		}

		for(const tile of actualTiles) {
			await tile.render();
		}

		this.drawnTiles = Array.from(this.freshDrawnTiles());

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
							const tile = tX[y];
							if(tDX[y] === undefined) {
								tDX[y] = {
									tile: tile,
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

		const dirs = {};
		dirs.north = new Vector3(0, -1, 0);
		dirs.south = new Vector3(0, 1, 0);
		dirs.east = new Vector3(1, 0, 0);
		dirs.west = new Vector3(-1, 0, 0);

		const lines = {};
		lines.north = new Line3(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
		lines.south = new Line3(new Vector3(0, 1, 0), new Vector3(1, 1, 0));
		lines.west = new Line3(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		lines.east = new Line3(new Vector3(1, 0, 0), new Vector3(1, 1, 0));

		for(const line in lines) {
			lines[line] = lines[line].multiplyScalar(Tile.SIZE);
		}

		function dirNeighbor(x, y, dir) {
			const nx = x + dir.x;
			const ny = y + dir.y;
			return (toDraw[nx] && toDraw[nx][ny]) ? toDraw[nx][ny] : null;
		}

		const drawLine = (t, line, dir, inset) => {
			const point = t.tile.corner.subtract(this.scrollOffset);
			const actualLine = line.add(point).add(dir.multiplyScalar(-inset));
			c.beginPath();
			c.moveTo(actualLine.a.x, actualLine.a.y);
			c.lineTo(actualLine.b.x, actualLine.b.y);

			const gradient = c.createLinearGradient(actualLine.a.x, actualLine.a.y, actualLine.b.x, actualLine.b.y);
			gradient.addColorStop(0, "white");
			gradient.addColorStop(0.25, "black");
			gradient.addColorStop(0.75, "white");
			gradient.addColorStop(1, "black");

			c.strokeStyle = gradient;
			c.stroke();
		};

		c.lineWidth = 2;

		for(const x in toDraw) {
			const tX = toDraw[x];
			for(const y in tX) {
				const t = tX[y];

				c.globalAlpha = t.alpha;

				for(const dirName in dirs) {
					const dir = dirs[dirName];
					const n = dirNeighbor(+x, +y, dir);
					if(t.inSelection && (!n || !n.inSelection || n.alpha != t.alpha)) {
						drawLine(t, lines[dirName], dir, 0);
					}

					if(t.inHoverSelection && (!n || !n.inHoverSelection || n.alpha != t.alpha)) {
						drawLine(t, lines[dirName], dir, 2);
					}
				}
			}
		}

		c.lineWidth = 1;
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

	async drawLabels() {
		const c = this.canvas.getContext("2d");
		c.textBaseline = "top";
		for await (const nodeRef of this.drawnNodes()) {
			const name = await nodeRef.getPString("name");
			if(name !== undefined) {
				const where = await this.getNamePosition(nodeRef);
				c.font = (this.selection.hasNodeRef(nodeRef) || this.hoverSelection.hasNodeRef(nodeRef)) ? "bold 24px serif" : "24px serif";
				const measure = c.measureText(name);
				c.globalAlpha = 0.25;
				c.fillStyle = "black";
				c.fillRect(where.x, where.y, measure.width, measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent);
				c.globalAlpha = 1;
				c.fillStyle = "white";
				c.fillText(name, where.x, where.y);
			}
		}
	}

	async drawHelp() {
		const c = this.canvas.getContext("2d");
		c.textBaseline = "top";
		c.font = "18px sans";
		c.fillStyle = "white";

		let infoLineY = 9;
		function infoLine(l) {
			c.fillText(l, 18, infoLineY);
			infoLineY += 24;
		}

		infoLine(`Brush: ${this.brush.getDescription()}`);

		// Debug help
		infoLine("Change brush mode with (A)dd, (S)elect or (D)elete. You can (N)ame the selected object.");
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
		infoLine("Right click to move map. Ctrl+C to return to center. Ctrl+Z is undo, Ctrl+Y is redo. ` to toggle debug mode.");

		this.hooks.call("draw_help", {
			infoLine: infoLine,
		});

		if(this.debugMode) {
			infoLine(`${Object.keys(Tile.getTileRenders()).length} cached tiles | ${this.drawnNodeIds.size} drawn nodes, ${this.offScreenDrawnNodeIds.size} on border`);
		}
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

	async drawScale() {
		const c = this.canvas.getContext("2d");
		const barHeight = 10;
		const barWidth = this.canvas.width / 5 - mod(this.canvas.width / 5, this.unitsToPixels(this.mapper.metersToUnits(100 * 5)));
		const barX = 10;
		const label2Y = this.canvas.height - barHeight;
		const barY = label2Y - barHeight - 15;
		const labelY = barY - barHeight / 2;

		c.textBaseline = "alphabetic";

		c.fillStyle = "black";
		c.fillRect(barX, barY, barWidth, barHeight);

		c.font = "12px mono";
		c.fillStyle = "white";

		for(let point = 0; point < 6; point++) {
			const y = (point % 2 === 0) ? labelY : label2Y;
			const pixel = barWidth * point / 5;
			c.fillText(`${Math.floor(this.mapper.unitsToMeters(this.pixelsToUnits(pixel)) + 0.5)}m`, barX + pixel, y);
			c.fillRect(barX + pixel, barY, 2, barHeight);
		}
	}

	/** Completely redraw the displayed UI. */
	async redraw() {
		await this.clearCanvas();

		await this.drawTiles();
		await this.drawSelection();
		await this.drawLabels();
		await this.drawBrush();

		await this.drawHelp();
		await this.drawScale();

		if(this.debugMode) {
			await this.drawDebug();
		}
	}

	async * visibleNodes() {
		const screenBox = this.screenBox();
		yield* this.mapper.getNodesTouchingArea(screenBox.map((v) => this.canvasPointToMap(v)));
	}

	async * drawnNodes() {
		for(const nodeId of this.drawnNodeIds) {
			yield this.mapper.backend.getNodeRef(nodeId);
		}
	}

	async * offScreenDrawnNodes() {
		for(const nodeId of this.offScreenDrawnNodeIds) {
			yield this.mapper.backend.getNodeRef(nodeId);
		}
	}

	* freshDrawnTiles() {
		const corner = this.scrollOffset.divideScalar(Tile.SIZE).map((v) => Math.floor(v));
		const end = this.scrollOffset.add(this.screenSize()).divideScalar(Tile.SIZE).map((v) => Math.ceil(v));

		const tX = this.tiles;
		for(let x = corner.x; x <= end.x; x++) {
			const tY = tX[x];
			if(tY) {
				for(let y = corner.y; y <= end.y; y++) {
					const tile = tY[y];
					if(tile) {
						yield tile;
					}
				}
			}
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

	unitsToMeters(units) {
		return units * 2;
	}

	metersToUnits(meters) {
		return meters / this.unitsToMeters(1);
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

	/** Get all nodes in or near a spatial box (according to their radii).
	 * @param box {Box3}
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getNodesTouchingArea(box) {
		yield* this.backend.getNodesTouchingArea(box);
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

import { HookContainer } from "./hook_container.js";
import { Vector3, Box3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";
import { DeleteBrush, AddBrush, SelectBrush, DistancePegBrush } from "./brushes/index.js";
import { PanEvent } from "./drag_events/index.js";
import { Selection } from "./selection.js";
import { ChangeNameAction } from "./actions/index.js";
import { Brushbar } from "./brushbar.js";
import { MegaTile, megaTileSize } from "./mega_tile.js";
import { NodeRender } from "./node_render.js";
import { style } from "./style.js";
import { version } from "./version.js";

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

		this.alive = true;

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

		this.nodeRenders = {};
		this.megaTiles = {};
		this.nodeIdsToMegatiles = {};
		this.drawnNodeIds = {};

		this.backgroundColor = "#997";

		this.pressedKeys = {};
		this.mouseDragEvents = {};
		this.oldMousePosition = Vector3.ZERO;
		this.mousePosition = Vector3.ZERO;

		this.debugMode = false;

		this.scrollDelta = 0;

		this.scrollOffset = Vector3.ZERO;
		this.defaultZoom = 5;
		this.zoom = this.defaultZoom;
		this.requestedZoom = this.zoom;

		this.altitudeIncrement = this.mapper.metersToUnits(5);

		this.distanceMarkers = {};

		this.brushes = {
			add: new AddBrush(this),
			select: new SelectBrush(this),
			"delete": new DeleteBrush(this),
			"peg1": new DistancePegBrush(this, 1),
			"peg2": new DistancePegBrush(this, 2),

		};

		this.brush = this.brushes.add;

		this.currentLayer = this.mapper.backend.layerRegistry.getDefault();

		this.hoverSelection = new Selection(this, []);
		this.selection = new Selection(this, []);

		this.styleElement = style();
		document.head.appendChild(this.styleElement);

		// The UI is just a canvas.
		// We will keep its size filling the parent element.
		this.canvas = document.createElement("canvas");
		this.canvas.tabIndex = 1;
		this.parent.appendChild(this.canvas);

		// The canvas has no extra size.
		this.canvas.style.padding = "0";
		this.canvas.style.margin = "0";
		this.canvas.style.border = "0";

		this.mapper.hooks.add("updateNode", (nodeRef) => this.recalculateNodeUpdate(nodeRef));
		this.mapper.hooks.add("removeNodes", (nodeRefs) => this.recalculateNodesRemove(nodeRefs));
		this.mapper.hooks.add("translateNodes", (nodeRefs) => this.recalculateNodesTranslate(nodeRefs));
		this.mapper.hooks.add("update", this.requestUpdateSelection.bind(this));


		this.brushbar = new Brushbar(this);

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
			this.requestRedraw();
		});

		this.canvas.addEventListener("mousemove", async (event) => {
			this.oldMousePosition = this.mousePosition;
			this.mousePosition = new Vector3(event.x, event.y, 0);

			for(const button in this.mouseDragEvents) {
				const mouseDragEvent = this.mouseDragEvents[button];
				await mouseDragEvent.next(this.mousePosition);
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
					if(this.zoom === this.defaultZoom) {
						this.setScrollOffset(Vector3.ZERO);
					}
					else {
						let f;
						f = () => {
							this.setScrollOffset(Vector3.ZERO);
							this.hooks.remove("changed_zoom", f);
						};

						this.hooks.add("changed_zoom", f);

						this.requestZoomChange(this.defaultZoom);
					}
				}
				else if(event.key === "=") {
					this.requestZoomChange(this.zoom - 1);
					event.preventDefault();
				}
				else if(event.key === "-") {
					this.requestZoomChange(this.zoom + 1);
					event.preventDefault();
				}
			}
			else if(event.key === "ArrowUp") {
				this.setScrollOffset(this.scrollOffset.subtract(new Vector3(0, this.screenSize().y / 3, 0)).round());
			}
			else if(event.key === "ArrowDown") {
				this.setScrollOffset(this.scrollOffset.add(new Vector3(0, this.screenSize().y / 3, 0)).round());
			}
			else if(event.key === "ArrowLeft") {
				this.setScrollOffset(this.scrollOffset.subtract(new Vector3(this.screenSize().x / 3, 0, 0)).round());
			}
			else if(event.key === "ArrowRight") {
				this.setScrollOffset(this.scrollOffset.add(new Vector3(this.screenSize().x / 3, 0, 0)).round());
			}
			else if(event.key === "1") {
				this.changeBrush(this.brushes.peg1);
			}
			else if(event.key === "2") {
				this.changeBrush(this.brushes.peg2);
			}
			else if(event.key === "d") {
				this.changeBrush(this.brushes["delete"]);
			}
			else if(event.key === "a") {
				this.changeBrush(this.brushes.add);
			}
			else if(event.key === "s") {
				this.changeBrush(this.brushes.select);
			}
			else if(event.key === "l") {
				const layerArray = Array.from(this.mapper.backend.layerRegistry.getLayers());
				const layerIdArray = layerArray.map(layer => layer.id);
				this.setCurrentLayer(layerArray[(layerIdArray.indexOf(this.getCurrentLayer().id) + 1) % layerArray.length]);
			}
			else if(event.key === "`") {
				this.debugMode = !this.debugMode;
			}
			else if(event.key === "n") {
				const nodeRef = await this.hoverSelection.getParent();
				if(nodeRef) {
					const where = (await this.getNamePosition(nodeRef)).where;

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

			this.scrollDelta = this.scrollDelta + event.deltaY;

			const delta = this.scrollDelta;

			if(Math.abs(delta) >= 100) {

				if(this.isKeyDown("q")) {
					if(delta < 0) {
						this.brush.increment();
					}
					else {
						this.brush.decrement();
					}
				}
				else if(this.isKeyDown("w")) {
					if(delta < 0) {
						this.brush.enlarge();
					}
					else {
						this.brush.shrink();
					}
				}
				else {
					this.requestZoomChange(this.zoom + (delta < 0 ? -1 : 1));
				}

				this.scrollDelta = 0;
			}

			this.requestRedraw();
		});

		// Watch the parent resize so we can keep our canvas filling the whole thing.
		this.parentObserver = new ResizeObserver(() => this.recalculateSize());
		this.parentObserver.observe(this.parent);

		this.recalculateSize();

		window.requestAnimationFrame(this.redrawLoop.bind(this));
		setTimeout(this.recalculateLoop.bind(this), 10);
		setTimeout(this.recalculateSelection.bind(this), 10);

		this.changeBrush(this.brushes.add);
		this.setCurrentLayer(this.getCurrentLayer());
	}

	getCurrentLayer() {
		return this.currentLayer;
	}

	setCurrentLayer(layer) {
		this.currentLayer = layer;
		this.brush.signalLayerChange(layer);
		this.hooks.call("current_layer_change", layer);
	}

	isPanning() {
		return this.mouseDragEvents[2] instanceof PanEvent;
	}

	isCalculatingDistance() {
		return this.brush instanceof DistancePegBrush;
	}

	setScrollOffset(value) {
		this.scrollOffset = value;
		this.recalculateEntireViewport();
	}

	registerKeyboardShortcut(filter, handler) {
		this.keyboardShortcuts.push({
			filter: filter,
			handler: handler,
		});
	}

	changeBrush(brush) {
		this.brush = brush;
		this.brush.switchTo();
		this.hooks.call("changed_brush", brush);
		this.requestRedraw();
	}

	requestZoomChange(zoom) {
		this.requestedZoom = Math.max(1, Math.min(zoom, 30));
	}

	async redrawLoop() {
		if(this.wantRedraw) {
			this.wantRedraw = false;
			await this.redraw();
		}

		if(this.alive) {
			window.requestAnimationFrame(this.redrawLoop.bind(this));
		}
	}

	async recalculateSelection() {
		if(this.wantRecheckSelection) {
			this.wantRecheckSelection = false;
			const closestNodeRef = await this.getDrawnNodeAtCanvasPoint(this.mousePosition, this.getCurrentLayer());
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

		if(this.alive) {
			setTimeout(this.recalculateSelection.bind(this), 100);
		}
	}

	async getCursorAltitude() {
		for (const origin of this.hoverSelection.getOrigins()) {
			return (await origin.getCenter()).z;
		}

		return 0;
	}

	async getDrawnNodeAtCanvasPoint(point, layer) {
		const absolutePoint = point.add(this.scrollOffset);
		const absoluteMegaTile = absolutePoint.divideScalar(megaTileSize).map(Math.floor);
		const megaTiles = this.megaTiles[this.unitsToPixels(1)];
		if(megaTiles !== undefined) {
			const megaTileX = megaTiles[absoluteMegaTile.x];
			if(megaTileX !== undefined) {
				const megaTile = megaTileX[absoluteMegaTile.y];
				if(megaTile !== undefined) {
					for(let i = megaTile.parts.length - 1; i >= 0; i--) {
						const part = megaTile.parts[i];
						if(layer.getType() === (await part.nodeRef.getLayer()).getType()) {
							if(part.absolutePoint.subtract(absolutePoint).length() < part.radius) {
								return part.nodeRef;
							}
						}
					}
				}
			}
		}
	}

	async recalculateLoop() {
		if(this.zoom !== this.requestedZoom) {
			const oldLandmark = this.canvasPointToMap(this.mousePosition);
			this.zoom = this.requestedZoom;
			const newLandmark = this.canvasPointToMap(this.mousePosition);
			this.scrollOffset = this.scrollOffset.add(this.mapPointToCanvas(oldLandmark).subtract(this.mapPointToCanvas(newLandmark)));
			await this.hooks.call("changed_zoom", this.zoom);
			this.recalculateEntireViewport();
		}

		if(this.recalculateViewport || this.recalculateUpdate.length > 0 || this.recalculateRemoved.length > 0 || this.recalculateTranslated.length > 0) {
			this.recalculateViewport = false;
			await this.recalculate(this.recalculateUpdate.splice(0, this.recalculateUpdate.length), this.recalculateRemoved.splice(0, this.recalculateRemoved.length), this.recalculateTranslated.splice(0, this.recalculateTranslated.length));
		}

		if(this.alive) {
			setTimeout(this.recalculateLoop.bind(this), 100);
		}
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
		return pixels * this.zoom / (1 + 20 / this.zoom);
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

	absoluteScreenBox() {
		return new Box3(this.scrollOffset, this.screenSize().add(this.scrollOffset));
	}

	/** Recalculate the UI size based on the parent.
	 * This requires a full redraw.
	 */
	recalculateSize() {
		// Keep the canvas matching the parent size.
		this.canvas.width = this.parent.clientWidth;
		this.canvas.height = this.parent.clientHeight;

		this.hooks.call("size_change");
	}

	getNodeRender(nodeRef) {
		let nodeRender = this.nodeRenders[nodeRef.id];
		if(nodeRender === undefined) {
			this.nodeRenders[nodeRef.id] = nodeRender = new NodeRender(this, nodeRef);
		}
		return nodeRender;
	}

	invalidateNodeRender(nodeRef) {
		this.removeNodeRender(nodeRef);
	}

	removeNodeRender(nodeRef) {
		delete this.nodeRenders[nodeRef.id];
	}

	recalculateEntireViewport() {
		this.recalculateViewport = true;
	}

	async objectNode(nodeRef) {
		if(await nodeRef.getNodeType() === "object")
			return nodeRef;
		else
			return await nodeRef.getParent();
	}

	recalculateNodeUpdate(nodeRef) {
		this.recalculateUpdate.push(nodeRef);
	}

	recalculateNodesRemove(nodeRefs) {
		this.recalculateRemoved.push(...nodeRefs);
	}

	recalculateNodesTranslate(nodeRefs) {
		this.recalculateTranslated.push(...nodeRefs);
	}

	async recalculate(updatedNodeRefs, removedNodeRefs, translatedNodeRefs) {
		const redrawNodeIds = new Set();
		const updateNodeIds = new Set();

		let drawnNodeIds = this.drawnNodeIds[this.unitsToPixels(1)];
		if(drawnNodeIds === undefined) {
			drawnNodeIds = this.drawnNodeIds[this.unitsToPixels(1)] = new Set();
		}

		const visibleNodeIds = new Set(await asyncFrom(this.visibleObjectNodes(), nodeRef => nodeRef.id));

		for(const visibleNodeId of visibleNodeIds) {
			redrawNodeIds.add(visibleNodeId);
			updateNodeIds.add(visibleNodeId);
		}

		for(const nodeRef of updatedNodeRefs) {
			const actualNodeRef = await this.objectNode(nodeRef);
			this.invalidateNodeRender(actualNodeRef);
			redrawNodeIds.add(actualNodeRef.id);
			updateNodeIds.add(actualNodeRef.id);
		}

		for(const nodeRef of removedNodeRefs) {
			const actualNodeRef = await this.objectNode(nodeRef);
			this.removeNodeRender(actualNodeRef);
			redrawNodeIds.add(actualNodeRef.id);
			drawnNodeIds.delete(actualNodeRef.id);
		}

		for(const nodeRef of translatedNodeRefs) {
			redrawNodeIds.add(nodeRef.id);
		}

		const redrawMegaTiles = new Set();

		for(const nodeId of redrawNodeIds) {
			const megaTilesByNode = this.nodeIdsToMegatiles[nodeId];
			if(megaTilesByNode !== undefined) {
				for(const megaTile of megaTilesByNode) {
					const tilePosition = megaTile.tileCorner;
					for(const nodeId of megaTile.nodeIds) {
						updateNodeIds.add(nodeId);
					}
					delete this.megaTiles[megaTile.oneUnitInPixels][tilePosition.x][tilePosition.y];
				}
				delete this.nodeIdsToMegatiles[nodeId];
			}
		}

		for(const nodeRef of removedNodeRefs) {
			const actualNodeRef = await this.objectNode(nodeRef);
			delete this.nodeIdsToMegatiles[actualNodeRef.id];
		}

		const screenBoxInMegaTiles = this.absoluteScreenBox().map(v => v.divideScalar(megaTileSize).map(Math.floor));

		const drawNodeIds = async (nodeIds) => {
			const drawAgainIds = new Set();
			const layers = [];

			for(const nodeId of nodeIds) {
				const nodeRef = this.mapper.backend.getNodeRef(nodeId);
				drawnNodeIds.add(nodeRef.id);

				const nodeRender = this.getNodeRender(nodeRef);
				for(const layer of await nodeRender.getLayers(this.unitsToPixels(1))) {
					layers.push(layer);
				}

				if(this.nodeIdsToMegatiles[nodeId] === undefined)
					this.nodeIdsToMegatiles[nodeId] = new Set();
			}

			layers.sort((a, b) => a.z - b.z);

			let megaTiles = this.megaTiles[this.unitsToPixels(1)];
			if(megaTiles === undefined) {
				megaTiles = this.megaTiles[this.unitsToPixels(1)] = {};
			}

			for(const layer of layers) {
				const nodeId = layer.nodeRender.nodeRef.id;

				const absoluteLayerBox = Box3.fromOffset(layer.corner, new Vector3(layer.canvas.width, layer.canvas.height, 0));
				const layerBoxInMegaTiles = absoluteLayerBox.map(v => v.divideScalar(megaTileSize).map(Math.floor));

				for(let x = Math.max(layerBoxInMegaTiles.a.x, screenBoxInMegaTiles.a.x); x <= Math.min(layerBoxInMegaTiles.b.x, screenBoxInMegaTiles.b.x); x++) {
					let megaTileX = megaTiles[x];
					if(megaTileX === undefined) {
						megaTileX = megaTiles[x] = {};
					}

					for(let y = Math.max(layerBoxInMegaTiles.a.y, screenBoxInMegaTiles.a.y); y <= Math.min(layerBoxInMegaTiles.b.y, screenBoxInMegaTiles.b.y); y++) {
						const megaTilePoint = new Vector3(x, y, 0);

						let megaTile = megaTileX[y];
						if(megaTile === undefined) {
							megaTile = megaTileX[y] = new MegaTile(this, this.unitsToPixels(1), megaTilePoint);
							redrawMegaTiles.add(megaTile);
						}

						const firstAppearanceInMegaTile = !megaTile.nodeIds.has(nodeId);

						if(redrawMegaTiles.has(megaTile) || firstAppearanceInMegaTile) {
							const pointOnLayer = megaTilePoint.multiplyScalar(megaTileSize).subtract(absoluteLayerBox.a);
							const realPointOnLayer = pointOnLayer.map(c => Math.max(c, 0));
							const pointOnMegaTile = realPointOnLayer.subtract(pointOnLayer);
							megaTile.context.drawImage(layer.canvas, realPointOnLayer.x, realPointOnLayer.y, megaTileSize, megaTileSize, pointOnMegaTile.x, pointOnMegaTile.y, megaTileSize, megaTileSize);

							this.nodeIdsToMegatiles[nodeId].add(megaTile);
							megaTile.nodeIds.add(nodeId);
							megaTile.parts.push(...layer.parts);
						}

						if(firstAppearanceInMegaTile) {
							for(const otherNodeId of megaTile.nodeIds) {
								drawAgainIds.add(otherNodeId);
							}
						}
					}
				}
			}

			return drawAgainIds;
		};

		const secondPassNodeIds = await drawNodeIds(updateNodeIds);
		await drawNodeIds(secondPassNodeIds);

		this.requestRedraw();
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
		c.textBaseline = "top";
		c.font = "18px sans";

		let infoLineY = 9;
		function infoLine(l) {
			const measure = c.measureText(l);
			c.globalAlpha = 0.25;
			c.fillStyle = "black";
			c.fillRect(18, infoLineY - 2, measure.width, Math.abs(measure.actualBoundingBoxAscent) + Math.abs(measure.actualBoundingBoxDescent) + 4);
			c.globalAlpha = 1;
			c.fillStyle = "white";
			c.fillText(l, 18, infoLineY);
			infoLineY += 24;
		}

		infoLine("Change brush mode with (A)dd, (S)elect or (D)elete. Press 1 or 2 to measure distances.");

		// Debug help
		infoLine("Press N to set or edit an object's name. Scroll or Ctrl+Plus/Minus to zoom. L to change layer.");
		if(this.brush instanceof AddBrush) {
			infoLine("Click to add terrain");
			infoLine("Hold Q while scrolling to change brush terrain/type; hold W while scrolling to change brush size.");
		}
		else if(this.brush instanceof SelectBrush) {
			infoLine("Click to select, drag to move.");
			infoLine("Hold Control to add to an existing selection.");
		}
		else if(this.brush instanceof DeleteBrush) {
			infoLine("Click to delete an area. Hold Shift to delete an entire object.");
			infoLine("Hold W while scrolling to change brush size.");
		}
		infoLine("Right click or arrow keys to move map. Ctrl+C to return to center. Ctrl+Z is undo, Ctrl+Y is redo. ` to toggle debug mode.");

		await this.hooks.call("draw_help", {
			infoLine: infoLine,
		});

		if(this.isCalculatingDistance()) {
			const a = this.distanceMarkers[1];
			const b = this.distanceMarkers[2];

			if(a && b) {
				const meters = this.mapper.unitsToMeters(a.subtract(b).length());
				infoLine(`Distance between markers: ${Math.floor(meters + 0.5)}m (${Math.floor(meters / 1000 + 0.5)}km)`);
			}
		}
	}

	async drawDebug() {
		const c = this.canvas.getContext("2d");

		const drawn = new Set();

		c.setLineDash([]);

		const drawNodePoint = async (nodeRef) => {
			if(!drawn.has(nodeRef.id)) {
				drawn.add(nodeRef.id);
				const position = this.mapPointToCanvas(await nodeRef.getCenter());
				c.beginPath();
				c.arc(position.x, position.y, 4, 0, 2 * Math.PI, false);
				c.strokeStyle = "white";
				c.stroke();

				// Draw edges.
				for await (const dirEdgeRef of nodeRef.getEdges()) {
					if(!drawn.has(dirEdgeRef.id)) {
						drawn.add(dirEdgeRef.id);
						const otherNodeRef = await dirEdgeRef.getDirOtherNode();
						const otherPosition = this.mapPointToCanvas(await otherNodeRef.getCenter());
						c.strokeStyle = "white";
						c.beginPath();
						c.moveTo(position.x, position.y);
						c.lineTo(otherPosition.x, otherPosition.y);
						c.stroke();
					}
				}

				// Draw effective bounding radius.
				const effectivePosition = this.mapPointToCanvas(await nodeRef.getEffectiveCenter());
				c.beginPath();
				c.arc(effectivePosition.x, effectivePosition.y, this.unitsToPixels(await nodeRef.getRadius()), 0, 2 * Math.PI, false);
				c.strokeStyle = "gray";
				c.stroke();
			}
		};

		for await (const nodeRef of this.drawnNodes()) {
			// Draw center.
			await drawNodePoint(nodeRef);

			// Draw border path.
			for await (const child of nodeRef.getChildren()) {
				await drawNodePoint(child);
			}

			// Draw bounding radius.
			const position = this.mapPointToCanvas(await nodeRef.getCenter());
			c.beginPath();
			c.arc(position.x, position.y, this.unitsToPixels(await nodeRef.getRadius()), 0, 2 * Math.PI, false);
			c.strokeStyle = "gray";
			c.stroke();
		}

		c.strokeStyle = "black";

		const screenBoxInMegaTiles = this.absoluteScreenBox().map(v => v.divideScalar(megaTileSize).map(Math.floor));
		for(let x = screenBoxInMegaTiles.a.x; x <= screenBoxInMegaTiles.b.x; x++) {
			for(let y = screenBoxInMegaTiles.a.y; y <= screenBoxInMegaTiles.b.y; y++) {
				const point = new Vector3(x, y, 0).multiplyScalar(megaTileSize).subtract(this.scrollOffset);
				c.strokeRect(point.x, point.y, megaTileSize, megaTileSize);
				c.strokeText(`${x}, ${y}`, point.x, point.y);
			}
		}
	}

	async drawScale() {
		const c = this.canvas.getContext("2d");
		const barHeight = 10;
		const barWidth = this.canvas.width / 5 - mod(this.canvas.width / 5, this.unitsToPixels(this.mapper.metersToUnits(10 ** Math.ceil(Math.log10(this.zoom * 5)))));
		const barX = 10;
		const label2Y = this.canvas.height - barHeight;
		const barY = label2Y - barHeight - 15;
		const labelY = barY - barHeight / 2;

		c.textBaseline = "alphabetic";

		c.fillStyle = "black";
		c.fillRect(barX, barY, barWidth, barHeight);

		c.font = "16px mono";
		c.fillStyle = "white";

		for(let point = 0; point < 6; point++) {
			const y = (point % 2 === 0) ? labelY : label2Y;
			const pixel = barWidth * point / 5;
			c.fillText(`${Math.floor(this.mapper.unitsToMeters(this.pixelsToUnits(pixel)) + 0.5)}m`, barX + pixel, y);
			c.fillRect(barX + pixel, barY, 2, barHeight);
		}
	}

	async drawVersion() {
		const c = this.canvas.getContext("2d");

		c.textBaseline = "top";
		c.font = "14px sans";

		const text = `v${version}`;
		const measure = c.measureText(text);

		const x = this.screenBox().b.x - measure.width;
		const height = Math.abs(measure.actualBoundingBoxAscent) + Math.abs(measure.actualBoundingBoxDescent);

		c.globalAlpha = 0.25;
		c.fillStyle = "black";
		c.fillRect(x, 0, measure.width, height);

		c.fillStyle = "white";
		c.globalAlpha = 1;

		c.fillText(text, x, 0);
	}

	async drawPegs() {
		const c = this.canvas.getContext("2d");

		const colors = {
			1: "red",
			2: "blue",
		};

		const positions = {};

		for(const distanceMarkerN in this.distanceMarkers) {
			const distanceMarker = this.distanceMarkers[distanceMarkerN];
			const position = this.mapPointToCanvas(distanceMarker);
			positions[distanceMarkerN] = position;
			c.beginPath();
			c.arc(position.x, position.y, 4, 0, 2 * Math.PI, false);
			c.fillStyle = colors[distanceMarkerN] || "black";
			c.fill();

			c.fillStyle = "white";

			c.textBaseline = "alphabetic";
			c.font = "16px mono";
			const worldPosition = this.canvasPointToMap(position).map(c => this.mapper.unitsToMeters(c)).round();
			const text = `${worldPosition.x}m, ${worldPosition.y}m, ${worldPosition.z}m`;
			c.fillText(text, position.x - c.measureText(text).width / 2, position.y - 16);
		}

		if(positions[1] && positions[2]) {
			c.lineWidth = 3;

			c.setLineDash([5, 15]);

			c.strokeStyle = "black";
			c.beginPath();
			c.moveTo(positions[1].x, positions[1].y);
			c.lineTo(positions[2].x, positions[2].y);
			c.stroke();

			c.setLineDash([11, 22]);

			c.strokeStyle = "white";
			c.beginPath();
			c.moveTo(positions[1].x, positions[1].y);
			c.lineTo(positions[2].x, positions[2].y);
			c.stroke();

			c.setLineDash([]);
			c.lineWidth = 1;

			const meters = this.mapper.unitsToMeters(this.distanceMarkers[1].subtract(this.distanceMarkers[2]).length());

			c.textBaseline = "top";
			c.font = "16px mono";
			const position = this.mapPointToCanvas(positions[1].add(positions[2]).divideScalar(2).round());
			const text = `Distance between markers: ${Math.floor(meters + 0.5)}m (${Math.floor(meters / 1000 + 0.5)}km)`;
			const measure = c.measureText(text);
			const height = Math.abs(measure.actualBoundingBoxAscent) + Math.abs(measure.actualBoundingBoxDescent);
			c.globalAlpha = 0.25;
			c.fillStyle = "black";
			c.fillRect(position.x - measure.width / 2, position.y, measure.width, height);
			c.globalAlpha = 1;
			c.fillStyle = "white";
			c.fillText(text, position.x - measure.width / 2, position.y);

		}
	}

	async drawNodes() {
		const c = this.canvas.getContext("2d");

		const megaTiles = this.megaTiles[this.unitsToPixels(1)];
		if(megaTiles !== undefined) {
			const screenBoxInMegaTiles = this.absoluteScreenBox().map(v => v.divideScalar(megaTileSize).map(Math.floor));
			for(let x = screenBoxInMegaTiles.a.x; x <= screenBoxInMegaTiles.b.x; x++) {
				const megaTileX = megaTiles[x];
				if(megaTileX !== undefined) {
					for(let y = screenBoxInMegaTiles.a.y; y <= screenBoxInMegaTiles.b.y; y++) {
						const megaTile = megaTileX[y];
						if(megaTile !== undefined) {
							const point = megaTile.corner.subtract(this.scrollOffset);
							c.drawImage(megaTile.canvas, point.x, point.y);
						}
					}
				}
			}
		}
	}

	/** Completely redraw the displayed UI. */
	async redraw() {
		await this.clearCanvas();

		await this.drawNodes();

		if(this.isCalculatingDistance()) {
			await this.drawPegs();
		}
		await this.drawBrush();

		await this.drawHelp();
		await this.drawScale();

		if(this.debugMode) {
			await this.drawDebug();
		}

		await this.drawVersion();
	}

	async * visibleObjectNodes() {
		yield* this.getObjectNodesInRelativeBox(this.screenBox());
	}

	async * getObjectNodesInAbsoluteBox(box) {
		yield* this.getObjectNodesInBox(box.map(v => v.map(c => this.pixelsToUnits(c))));
	}

	async * getObjectNodesInRelativeBox(box) {
		yield* this.getObjectNodesInBox(box.map((v) => this.canvasPointToMap(v)));
	}

	async * getObjectNodesInBox(box) {
		const mapBox = box.map(v => v);
		mapBox.a.z = -Infinity;
		mapBox.b.z = Infinity;
		yield* this.mapper.getObjectNodesTouchingArea(mapBox, this.pixelsToUnits(1));
	}

	async * drawnNodes() {
		const drawnNodeIds = this.drawnNodeIds[this.unitsToPixels(1)];
		if(drawnNodeIds !== undefined) {
			for(const nodeId of drawnNodeIds) {
				yield this.mapper.backend.getNodeRef(nodeId);
			}
		}
	}

	/** Disconnect the render context from the page and clean up listeners. */
	disconnect() {
		this.alive = false;
		this.hooks.call("disconnect").then(() => {
			this.styleElement.remove();
			this.parentObserver.disconnect();
			this.canvas.remove();
		});
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

	/** Get all nodes in or near a spatial box (according to their radii).
	 * @param box {Box3}
	 * @param minRadius {number}
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getNodesTouchingArea(box, minRadius) {
		yield* this.backend.getNodesTouchingArea(box, minRadius);
	}

	/** Get all nodes in or near a spatial box (according to their radii).
	 * @param box {Box3}
	 * @param minRadius {number}
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getObjectNodesTouchingArea(box, minRadius) {
		yield* this.backend.getObjectNodesTouchingArea(box, minRadius);
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

	async insertNode(point, nodeType, options) {
		const nodeRef = await this.backend.createNode(options.parent ? options.parent.id : null, nodeType);
		await nodeRef.setCenter(point);
		await nodeRef.setEffectiveCenter(point);
		await nodeRef.setType(options.type);
		await nodeRef.setLayer(this.backend.layerRegistry.get(options.type.getLayer()));
		await nodeRef.setRadius(options.radius);
		await this.hooks.call("insertNode", nodeRef);
		return nodeRef;
	}

	async translateNode(originNodeRef, offset) {
		const nodeRefs = await asyncFrom(originNodeRef.getSelfAndAllDescendants());
		for(const nodeRef of nodeRefs) {
			await nodeRef.setCenter((await nodeRef.getCenter()).add(offset));
			await nodeRef.setEffectiveCenter((await nodeRef.getEffectiveCenter()).add(offset));
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
		const parentNodeIds = new Set();

		await this.hooks.call("removeNodes", nodeRefsWithChildren);

		for(const nodeRef of nodeRefsWithChildren) {
			const parent = await nodeRef.getParent();
			if(parent && !nodeIds.has(parent.id)) {
				parentNodeIds.add(parent.id);
			}
			await nodeRef.remove();
		}

		for(const nodeId of parentNodeIds) {
			const nodeRef = this.backend.getNodeRef(nodeId);
			if(!(await nodeRef.hasChildren())) {
				await nodeRef.remove();
				nodeRefsWithChildren.push(nodeRef);
			}
		}

		return nodeRefsWithChildren;
	}

	async unremoveNodes(nodeRefs) {
		for(const nodeRef of nodeRefs) {
			await nodeRef.unremove();
			await this.hooks.call("insertNode", nodeRef);
		}
	}

	async removeEdges(edgeRefs) {
		for(const edgeRef of edgeRefs) {
			for await (const nodeRef of edgeRef.getNodes()) {
				await this.hooks.call("updateNode", nodeRef);
			}
			await edgeRef.remove();
		}
	}

	async unremoveEdges(edgeRefs) {
		for(const edgeRef of edgeRefs) {
			await edgeRef.unremove();
			for await (const nodeRef of edgeRef.getNodes()) {
				await this.hooks.call("updateNode", nodeRef);
			}
		}
	}
}

export { Mapper };

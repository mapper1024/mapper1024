import { HookContainer } from "./hook_container.js";
import { Vector3, Box3, Line3 } from "./geometry.js";
import { asyncFrom, mod } from "./utils.js";

class Action {
	constructor(context, options) {
		this.context = context;
		this.options = options;
	}

	empty() {
		return true;
	}

	async perform() {}
}

class DrawPathAction extends Action {
	async perform() {
		const path = this.options.path;
		const scrollOffset = this.options.scrollOffset;

		const pathOnMap = path.mapOrigin((origin) => origin.add(scrollOffset)).withBisectedLines(this.options.radius);

		const placedNodes = [];

		if(!this.options.parent) {
			this.options.parent = await this.context.mapper.insertNode(pathOnMap.getCenter(), {
				type: this.options.nodeType,
				radius: 0,
			});

			placedNodes.push(this.options.parent);
		}

		const pathCenter = pathOnMap.getCenter();

		const vertices = Array.from(pathOnMap.vertices()).sort((a, b) => a.subtract(pathCenter).lengthSquared() - b.subtract(pathCenter).lengthSquared());

		const placedVertices = [];

		const radius = this.options.radius;

		placeEachVertex: for(const vertex of vertices) {
			for(const placedVertex of placedVertices) {
				if(placedVertex.point.subtract(vertex).length() < (radius + placedVertex.radius) / 4) {
					continue placeEachVertex;
				}
			}

			if(radius > 0) {
				placedNodes.push(await this.context.mapper.insertNode(vertex, {
					type: this.options.nodeType,
					radius: radius,
					parent: this.options.parent,
				}));

				placedVertices.push({
					point: vertex,
					radius: radius,
				});
			}
		}

		const undoAction = new RemoveAction(this.context, {
			nodeRefs: placedNodes,
		});

		if(this.options.fullCalculation) {
			const undoCleanupAction = await this.context.performAction(new NodeCleanupAction(this.context, {nodeRef: this.options.parent, type: this.options.nodeType}), false);
			return new BulkAction(this.context, {
				actions: [undoCleanupAction, undoAction],
			});
		}
		else {
			return undoAction;
		}
	}

	empty() {
		return false;
	}
}

class NodeCleanupAction extends Action {
	async perform() {
		const toRemove = new Set();

		const vertices = (await asyncFrom(this.getAllVertices())).sort((a, b) => a.radius - b.radius);

		for(const vertex of vertices) {
			if(vertex.removable) {
				for(const otherVertex of vertices) {
					if(!toRemove.has(otherVertex.nodeRef.id) && otherVertex !== vertex && otherVertex.point.subtract(vertex.point).length() < (vertex.radius + otherVertex.radius) / 4) {
						toRemove.add(vertex.nodeRef.id);
					}
				}
			}
		}

		return await this.context.performAction(new RemoveAction(this.context, {nodeRefs: [...toRemove].map((id) => this.context.mapper.backend.getNodeRef(id))}), false);
	}

	async * getAllNodes() {
		for await (const nodeRef of this.options.nodeRef.getSelfAndAllDescendants()) {
			if(await nodeRef.getPString("type") === this.options.type) {
				yield nodeRef;
			}
		}
	}

	async * getAllVertices() {
		for await (const nodeRef of this.getAllNodes()) {
			const radius = await nodeRef.getPNumber("radius");
			if(radius > 0) {
				yield {
					nodeRef: nodeRef,
					removable: !(await nodeRef.hasChildren()),
					point: await nodeRef.center(),
					radius: radius,
				};
			}
		}
	}
}

class RemoveAction extends Action {
	async perform() {
		const affectedNodeRefs = await this.context.mapper.removeNodes(this.options.nodeRefs);
		return new UnremoveAction(this.context, {nodeRefs: affectedNodeRefs});
	}

	empty() {
		return this.options.nodeRefs.length === 0;
	}
}

class UnremoveAction extends Action {
	async perform() {
		await this.context.mapper.unremoveNodes(this.options.nodeRefs);
		return new RemoveAction(this.context, {nodeRefs: this.options.nodeRefs});
	}

	empty() {
		return this.options.nodeRefs.length === 0;
	}
}

class TranslateAction extends Action {
	async perform() {
		await this.context.mapper.translateNode(this.options.nodeRef, this.options.offset);
		return new TranslateAction(this.context, {
			nodeRef: this.options.nodeRef,
			offset: this.options.offset.multiplyScalar(-1),
		});
	}

	empty() {
		return false;
	}
}

class BulkAction extends Action {
	async perform() {
		const actions = [];

		for(const action of this.options.actions.reverse()) {
			actions.push(await this.context.performAction(action, false));
		}

		return new BulkAction(this.context, {
			actions: actions,
		});
	}

	empty() {
		for(const action of this.options.actions) {
			if(!action.empty()) {
				return false;
			}
		}
		return true;
	}
}

class Brush {
	constructor(context) {
		this.context = context;

		this.size = 1;
		this.maxSize = 10;
		this.lastSizeChange = performance.now();
	}

	getDescription() {
		throw "description not implemented";
	}

	getRadius() {
		return this.size * 32;
	}

	increment() {}

	decrement() {}

	shrink() {
		this.size = Math.max(1, this.size - 1);
		this.lastSizeChange = performance.now();
	}

	enlarge() {
		this.size = Math.min(this.maxSize, this.size + 1);
		this.lastSizeChange = performance.now();
	}

	sizeRecentlyChanged() {
		return performance.now() - this.lastSizeChange < 1000;
	}

	async drawAsCircle(context, position) {
		context.beginPath();
		context.arc(position.x, position.y, this.getRadius(), 0, 2 * Math.PI, false);
		context.strokeStyle = "white";
		context.stroke();
	}

	async draw(context, position) {
		await this.drawAsCircle(context, position);
	}

	async trigger(where, mouseDragEvent) {
		where;
		mouseDragEvent;
	}

	async activate(where) {
		where;
	}
}

class DeleteBrush extends Brush {
	getDescription() {
		return `Delete (size ${this.size})`;
	}

	async activate(where) {
		return new CumulativeDrawEvent(this.context, where);
	}

	async * getNodesInBrush(brushPosition) {
		for await (const nodeRef of this.context.visibleNodes()) {
			if(this.context.mapPointToCanvas((await nodeRef.center())).subtract(brushPosition).length() <= this.getRadius() && await nodeRef.getPNumber("radius") > 0) {
				yield nodeRef;
			}
		}
	}

	async draw(context, position) {
		if(this.context.isKeyDown("Control") || this.sizeRecentlyChanged()) {
			await this.drawAsCircle(context, position);
		}
	}

	async triggerAtPosition(brushPosition) {
		let toRemove;

		if(this.context.isKeyDown("Control")) {
			toRemove = await asyncFrom(this.getNodesInBrush(brushPosition));
		}
		else {
			let selection;

			if(this.context.isKeyDown("Shift")) {
				selection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);
			}
			else {
				selection = this.context.hoverSelection;
			}

			toRemove = selection.getOrigins();
		}

		return new RemoveAction(this.context, {nodeRefs: toRemove});
	}

	async triggerOnPath(path) {
		const actions = [];
		for(const vertex of path.vertices()) {
			actions.push(await this.triggerAtPosition(vertex));
		}
		return new BulkAction(this.context, {actions: actions});
	}

	async trigger(path) {
		return await this.context.performAction(await this.triggerOnPath(path));
	}
}

class NodeAddBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 1;
		this.nodeTypes = ["water", "grass", "forest", "mountain"];
	}

	getDescription() {
		return `Place ${this.getNodeType()} (size ${this.size})`;
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

	async trigger(path, mouseDragEvent) {
		const drawPathActionOptions = {
			path: path,
			radius: this.getRadius(),
			nodeType: this.getNodeType(),
			scrollOffset: this.context.scrollOffset,
			fullCalculation: mouseDragEvent.done,
		};

		const selectionParent = await mouseDragEvent.getSelectionParent();
		if(selectionParent && await selectionParent.getPString("type") === this.getNodeType()) {
			drawPathActionOptions.parent = selectionParent;
		}

		return await this.context.performAction(new DrawPathAction(this.context, drawPathActionOptions));
	}

	async activate(where) {
		return new DrawEvent(this.context, where);
	}
}

class NodeSelectBrush extends Brush {
	constructor(context) {
		super(context);
	}

	getDescription() {
		return "Select/Move";
	}

	async draw(context, position) {
		context;
		position;
	}

	async activate(where) {
		if(!this.context.hoveringOverSelection()) {
			if(this.context.hoverSelection.exists()) {
				let newSelection = null;

				if(this.context.isKeyDown("Shift")) {
					newSelection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);
				} else {
					newSelection = this.context.hoverSelection;
				}

				if(newSelection !== null) {
					if(this.context.isKeyDown("Control")) {
						this.context.selection = await this.context.selection.joinWith(newSelection);
					}
					else {
						this.context.selection = newSelection;
					}
				}
			}
			else {
				this.context.selection = new Selection(this.context, []);
			}
		}

		if(this.context.hoveringOverSelection()) {
			return new DragEvent(this.context, where, this.context.selection.getOrigins());
		}
		else {
			this.context.selection = new Selection(this, []);
		}
	}
}

class Selection {
	constructor(context, nodeIds) {
		this.context = context;
		this.originIds = new Set(nodeIds);
		this.parentNodeIds = new Set();
		this.selectedNodeIds = new Set(this.originIds);
		this.childNodeIds = new Set();
		this.siblingNodeIds = new Set();
		this.directSelectedNodeIds = new Set();
	}

	static async fromNodeIds(context, nodeIds) {
		const selection = new Selection(context, nodeIds);
		await selection.update();
		return selection;
	}

	static async fromNodeRefs(context, nodeRefs) {
		return await Selection.fromNodeIds(context, nodeRefs.map((nodeRef) => nodeRef.id));
	}

	async joinWith(other) {
		return Selection.fromNodeRefs(this.context, [...this.getOrigins(), ...other.getOrigins()]);
	}

	async update() {
		const selectedNodeIds = new Set(this.originIds);
		const parentNodeIds = new Set();
		const childNodeIds = new Set();
		const siblingNodeIds = new Set();
		const directSelectedNodeIds = new Set(this.originIds);

		for(const nodeRef of this.getOrigins()) {
			for await (const childNodeRef of nodeRef.getAllDescendants()) {
				selectedNodeIds.add(childNodeRef.id);
				directSelectedNodeIds.add(childNodeRef.id);
				childNodeIds.add(childNodeRef.id);
			}

			const parent = await nodeRef.getParent();
			if(parent) {
				selectedNodeIds.add(parent.id);
				parentNodeIds.add(parent.id);
				directSelectedNodeIds.add(parent.id);
				for await (const siblingNodeRef of parent.getAllDescendants()) {
					siblingNodeIds.add(siblingNodeRef.id);
					selectedNodeIds.add(siblingNodeRef.id);
				}
			}
		}

		this.originIds.forEach((id) => siblingNodeIds.delete(id));
		parentNodeIds.forEach((id) => siblingNodeIds.delete(id));
		childNodeIds.forEach((id) => siblingNodeIds.delete(id));

		this.parentNodeIds = parentNodeIds;
		this.selectedNodeIds = selectedNodeIds;
		this.childNodeIds = childNodeIds;
		this.siblingNodeIds = siblingNodeIds;
		this.directSelectedNodeIds = directSelectedNodeIds;
	}

	hasNodeRef(nodeRef) {
		return this.selectedNodeIds.has(nodeRef.id);
	}

	nodeRefIsOrigin(nodeRef) {
		return this.originIds.has(nodeRef.id);
	}

	nodeRefIsParent(nodeRef) {
		return this.parentNodeIds.has(nodeRef.id);
	}

	nodeRefIsChild(nodeRef) {
		return this.childNodeIds.has(nodeRef.id);
	}

	nodeRefIsSibling(nodeRef) {
		return this.siblingNodeIds.has(nodeRef.id);
	}

	getOrigins() {
		return Array.from(this.originIds.values()).map((id) => this.context.mapper.backend.getNodeRef(id));
	}

	exists() {
		return this.originIds.size > 0;
	}

	contains(other) {
		for(const nodeId of other.directSelectedNodeIds) {
			if(!this.directSelectedNodeIds.has(nodeId)) {
				return false;
			}
		}
		return true;
	}
}

class Path {
	constructor(startPoint) {
		this.lines = [];
		this.origin = startPoint;
		this.at = Vector3.ZERO;
	}

	mapOrigin(f) {
		const path = new Path(f(this.origin));
		path.lines = this.lines;
		path.at = this.at;
		return path;
	}

	mapLines(f) {
		const path = new Path(this.origin);
		path.lines = this.lines.map((line) => line.map(f));
		path.at = f(this.at);
	}

	withBisectedLines(radius) {
		const path = new Path(this.origin);

		function addBisectedLine(line) {
			if(line.distance() >= radius) {
				const middle = line.a.add(line.b).divideScalar(2);
				const lineA = new Line3(line.a, middle);
				const lineB = new Line3(middle, line.b);
				addBisectedLine(lineA);
				addBisectedLine(lineB);
			}
			else {
				path.lines.push(line);
			}
		}

		for(const line of this.lines) {
			addBisectedLine(line);
		}

		path.at = this.at;
		return path;
	}

	next(nextPoint) {
		const nextRelativePoint = nextPoint.subtract(this.origin);
		if(this.at.subtract(nextRelativePoint).lengthSquared() > 0) {
			this.lines.push(new Line3(this.at, nextRelativePoint));
			this.at = nextRelativePoint;
		}
	}

	lastLine() {
		const lastLine = this.lines[this.lines.length - 1];
		return lastLine ? lastLine : Line3.ZERO;
	}

	lastVertex() {
		return this.lastLine().b.add(this.origin);
	}

	pop() {
		const lastLine = this.lines.pop();
		return lastLine ? lastLine : Line3.ZERO;
	}

	push(line) {
		return this.lines.push(line);
	}

	* vertices() {
		yield this.at.add(this.origin);
		for(const line of this.lines) {
			yield line.b.add(this.origin);
		}
	}

	getCenter() {
		const vertices = Array.from(this.vertices());
		let sum = Vector3.ZERO;
		for(const vertex of vertices) {
			sum = sum.add(vertex);
		}
		return sum.divideScalar(vertices.length);
	}

	getRadius() {
		const center = this.getCenter();
		let furthest = this.getCenter();
		for(const vertex of this.vertices()) {
			if(vertex.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
				furthest = vertex;
			}
		}
		return furthest.subtract(center).length();
	}

	asMostRecent() {
		const lastLine = this.lastLine();
		const path = new Path(this.origin.add(lastLine.a));
		path.next(this.origin.add(lastLine.b));
		return path;
	}
}

class MouseDragEvent {
	constructor(context, startPoint) {
		this.context = context;
		this.path = new Path(startPoint);
		this.done = false;
		this.hoverSelection = this.context.hoverSelection;
	}

	next(nextPoint) {
		this.path.next(nextPoint);
	}

	end(endPoint) {
		this.path.next(endPoint);
		this.done = true;
	}

	cancel() {}

	async getSelectionParent() {
		if(this.hoverSelection.exists()) {
			for(const origin of this.hoverSelection.getOrigins()) {
				const parent = await origin.getParent();
				if(parent && !(await origin.hasChildren())) {
					return parent;
				}
				else {
					return origin;
				}
			}
		}

		return null;
	}
}

class DrawEvent extends MouseDragEvent {
	constructor(context, startPoint) {
		super(context, startPoint);

		this.undoActions = [];
	}

	getUndoAction() {
		return new BulkAction(this.context, {
			actions: this.undoActions.splice(0, this.undoActions.length).reverse(),
		});
	}

	async next(nextPoint) {
		super.next(nextPoint);

		this.undoActions.push(await this.trigger(this.path.asMostRecent()));
	}

	async end(endPoint) {
		super.end(endPoint);

		await this.clear();

		this.undoActions.push(await this.trigger(this.path));

		this.context.pushUndo(this.getUndoAction());
	}

	async clear() {
		return await this.context.performAction(this.getUndoAction(), false);
	}

	async trigger(path) {
		return await this.context.brush.trigger(path, this);
	}

	cancel() {
		this.end(this.path.lastVertex());
	}
}

class CumulativeDrawEvent extends MouseDragEvent {
	constructor(context, startPoint) {
		super(context, startPoint);

		this.undoActions = [];
	}

	getUndoAction() {
		return new BulkAction(this.context, {
			actions: this.undoActions.splice(0, this.undoActions.length).reverse(),
		});
	}

	async next(nextPoint) {
		super.next(nextPoint);

		this.undoActions.push(await this.trigger(this.path.asMostRecent()));
	}

	async end(endPoint) {
		super.end(endPoint);

		this.undoActions.push(await this.trigger(this.path.asMostRecent()));

		this.context.pushUndo(this.getUndoAction());
	}

	async trigger(path) {
		return await this.context.brush.trigger(path, this);
	}

	cancel() {
		this.end(this.path.lastVertex());
	}
}

class DragEvent extends MouseDragEvent {
	constructor(context, startPoint, nodeRefs) {
		super(context, startPoint);

		this.nodeRefs = nodeRefs;

		this.undoActions = [];
	}

	getUndoAction() {
		return new BulkAction(this.context, {
			actions: this.undoActions.splice(0, this.undoActions.length).reverse(),
		});
	}

	async next(nextPoint) {
		super.next(nextPoint);

		for(const nodeRef of this.nodeRefs) {
			this.undoActions.push(await this.context.performAction(new TranslateAction(this.context, {
				nodeRef: nodeRef,
				offset: this.path.lastLine().vector(),
			}), false));
		}
	}

	async end(endPoint) {
		this.next(endPoint);

		this.context.pushUndo(this.getUndoAction());
	}

	cancel() {
		this.context.performAction(this.getUndoAction(), false);
	}
}

class PanEvent extends MouseDragEvent {
	next(nextPoint) {
		super.next(nextPoint);
		this.context.scrollOffset = this.context.scrollOffset.subtract(this.path.lastLine().vector());
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

		this.brush = new NodeAddBrush(this);

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
				this.changeBrush(new NodeAddBrush(this));
			}
			else if(event.key === "s") {
				this.changeBrush(new NodeSelectBrush(this));
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
		for await (const nodeRef of this.visibleNodes()) {
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

		for await (const nodeRef of this.visibleNodes()) {
			const inSelection = this.selection.hasNodeRef(nodeRef);
			const inHoverSelection = this.hoverSelection.hasNodeRef(nodeRef);
			const sibling = this.hoverSelection.nodeRefIsSibling(nodeRef) || this.selection.nodeRefIsSibling(nodeRef);
			const notSibling = (inSelection && !this.selection.nodeRefIsSibling(nodeRef)) || (inHoverSelection && !this.hoverSelection.nodeRefIsSibling(nodeRef));
			const alpha = (sibling && !notSibling) ? 0.2 : 1;

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
							tDX[y].inSelection ||= inSelection;
							tDX[y].inHoverSelection ||= inHoverSelection;
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
		if(this.brush instanceof NodeAddBrush) {
			infoLine("Click to add terrain");
			infoLine("Hold Q while scrolling to change brush type; hold W while scrolling to change brush size.");
		}
		else if(this.brush instanceof NodeSelectBrush) {
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

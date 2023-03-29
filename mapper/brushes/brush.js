import { HookContainer } from "../hook_container.js";

/** A Brush represents a tool used to manipulate the map,
 * such as a brush to draw terrain or a brush to select terrain.
 *
 * Brush types inheirit from this class and (re-)implement its methods.
 */
class Brush {
	constructor(context) {
		this.context = context;

		// The current "size" of the brush, in arbitrary units.
		this.size = 1;

		// The maximum "size" of the brush, in arbitrary units.
		this.maxSize = 20;

		// A change in the brush's size will be considered recent if it happened less than this many ms ago.
		this.sizeChangeRecentTimeout = 1000;

		this.hooks = new HookContainer();

		this.hooksToClear = [];
	}

	usesSelection() {
		return false;
	}

	usesHover() {
		return false;
	}

	/** Modify the given button's text, title, etc. to represent the brush.
	 * @param button {Element} the HTML button to modify
	 */
	displayButton(button) {
		button.innerText = this.constructor.name;
	}

	/** Modify the given brushbar to display options, information, or other controls for this brush.
	 * @param brushBar the {BrushBar} being used
	 * @param container the actual HTML {Element} to add elements to; will typically be displayed within the brushbar
	 */
	displaySidebar(brushBar, container) {
		brushBar;
		container;
	}

	/** Called when the brush is switched to from another brush. */
	switchTo() {
		for(const hook of this.hooksToClear.splice(0, this.hooksToClear.length)) {
			const k = hook[0];
			const f = hook[1];
			this.hooks.remove(k, f);
		}
		this.lastSizeChange = performance.now();
	}

	/** Get a human-readable description of the brush, indicating what options are being used.
	 */
	getDescription() {
		throw "description not implemented";
	}

	/** Get the radius, in pixels, of the brush as currently displayed. */
	getRadius() {
		return this.size * 15;
	}

	/** Get the radius, in meters, of the brush as currently displayed. */
	sizeInMeters() {
		return this.context.mapper.unitsToMeters(this.context.pixelsToUnits(this.getRadius()));
	}

	/** Called when the user tries to "increment" the brush; may scroll through brush options, etc. */
	increment() {}

	/** Called when the user tries to "decrement" the brush; may scroll through brush options, etc. */
	decrement() {}

	/** Called when the user tries to shrink the size of the brush. */
	shrink() {
		this.size = Math.max(1, this.size - 1);
		this.lastSizeChange = performance.now();
		this.context.hooks.call("brush_size_change", this);
	}

	/** Called when the user tries to enlarge the size of the brush. */
	enlarge() {
		this.size = Math.min(this.maxSize, this.size + 1);
		this.lastSizeChange = performance.now();
		this.context.hooks.call("brush_size_change", this);
	}

	/** Has the size of the brush been recently changed?
	 * @returns {boolean}
	 */
	sizeRecentlyChanged() {
		return performance.now() - this.lastSizeChange < this.sizeChangeRecentTimeout;
	}

	/** Draw the brush as a circle with generic information on a canvas.
	 * @param context {CanvasRenderingContext2D} the canvas context to draw on
	 * @param position {Vector3} the center of where the brush should be drawn
	 */
	async drawAsCircle(context, position) {
		context.setLineDash([]);

		context.beginPath();
		context.arc(position.x, position.y, this.getRadius(), 0, 2 * Math.PI, false);
		context.strokeStyle = "white";
		context.lineWidth = 1;
		context.stroke();

		context.fillStyle = "white";
		context.fillRect(position.x - this.getRadius(), position.y - 16, 2, 32);
		context.fillRect(position.x + this.getRadius(), position.y - 16, 2, 32);
		context.fillRect(position.x - this.getRadius(), position.y - 1, this.getRadius() * 2, 2);

		context.textBaseline = "alphabetic";
		context.font = "16px mono";
		const sizeText = `${Math.floor(this.sizeInMeters() * 2 + 0.5)}m`;
		context.fillText(sizeText, position.x - context.measureText(sizeText).width / 2, position.y - 6);

		context.textBaseline = "top";
		const worldPosition = this.context.canvasPointToMap(position).map(c => this.context.mapper.unitsToMeters(c)).round();
		const positionText = `${worldPosition.x}m, ${worldPosition.y}m, ${this.context.mapper.unitsToMeters(await this.context.getCursorAltitude())}m`;
		context.fillText(positionText, position.x - Math.min(this.getRadius(), context.measureText(positionText).width / 2), position.y + this.getRadius() + 6);
	}

	/** Draw the brush on a canvas at a given position.
	 * @param context {CanvasRenderingContext2D} the canvas context to draw on
	 * @param position {Vector3} the center of where the brush should be drawn
	 */
	async draw(context, position) {
		// Default implementation just draws a generic information brush as a circle.
		await this.drawAsCircle(context, position);
	}

	/** Called when the brush is triggered during a mouse drag event.
	 * Mouse drag events may trigger the brush every time the mouse moves across the screen while bring held down.
	 * @param where {Vector3} where on the screen the brush is at this point
	 * @param mouseDragEvent {DragEvent} the ongoing mouse drag event
	 */
	async trigger(where, mouseDragEvent) {
		where;
		mouseDragEvent;
	}

	/** Called when the brush is first activated (by a click).
	 * @param where {Vector3} where on the screen the brush was activated
	 */
	async activate(where) {
		where;
	}

	/** Called when the brush's context's current layer changes. */
	signalLayerChange(layer) {
		layer;
	}
}

export { Brush };

import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { DrawPathAction } from "../actions/draw_path_action.js";
import { mod } from "../utils.js";

class AddBrush extends Brush {
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
		return new DrawEvent(this.context, where, false);
	}
}

export { AddBrush };

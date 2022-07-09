import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { DrawPathAction } from "../actions/draw_path_action.js";
import { mod } from "../utils.js";

class AddBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 1;
		this.nodeTypes = Array.from(this.context.mapper.backend.nodeTypeRegistry.getTypes());
	}

	getDescription() {
		return `Place ${this.getNodeType().getDescription()} (radius ${this.sizeInMeters()}m)`;
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
			fullCalculation: mouseDragEvent.done,
			parent: this.parentNode,
			undoParent: this.undoParent,
		};

		return await this.context.performAction(new DrawPathAction(this.context, drawPathActionOptions));
	}

	async activate(where) {
		const mouseDragEvent = new DrawEvent(this.context, where);

		const selectionParent = await mouseDragEvent.getSelectionParent();
		if(selectionParent && (await selectionParent.getType()).id === this.getNodeType().id) {
			this.parentNode = selectionParent;
			this.undoParent = false;
		}
		else {
			this.parentNode = await this.context.mapper.insertNode(this.context.canvasPointToMap(where), {
				type: this.getNodeType(),
				radius: 0,
			});
			this.undoParent = true;
		}

		return mouseDragEvent;
	}
}

export { AddBrush };

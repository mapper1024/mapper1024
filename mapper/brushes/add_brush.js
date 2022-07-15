import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { DrawPathAction } from "../actions/draw_path_action.js";
import { mod } from "../utils.js";

class AddBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 1;
		this.nodeTypes = Array.from(this.context.mapper.backend.nodeTypeRegistry.getTypes());
		this.lastTypeChange = performance.now();
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
		this.lastTypeChange = performance.now();
	}

	decrement() {
		this.nodeTypeIndex = this.nodeTypeIndex - 1;
		this.wrapIndex();
		this.lastTypeChange = performance.now();
	}

	wrapIndex() {
		const len = this.nodeTypes.length;
		this.nodeTypeIndex = (len == 0) ? -1 : mod(this.nodeTypeIndex, len);
	}

	typeRecentlyChanged() {
		return performance.now() - this.lastTypeChange < 1000;
	}

	async draw(context, position) {
		await super.draw(context, position);

		if(this.typeRecentlyChanged() && this.nodeTypes.length > 0) {
			const radius = Math.min(4, Math.ceil(this.nodeTypes.length / 2));
			for(let i = -radius; i <= radius; i++) {
				const type = this.nodeTypes[mod(this.nodeTypeIndex + i, this.nodeTypes.length)];
				const text = type.getDescription();
				context.font = (i === 0) ? "bold 12px sans" : `${12 - Math.abs(i)}px sans`;
				context.fillText(text, position.x - this.getRadius() - context.measureText(text).width - 4, position.y + 4 + (-i) * 14);
			}
		}
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

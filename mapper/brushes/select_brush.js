import { Brush } from "./brush.js";
import { Selection } from "../selection.js";
import { TranslateEvent } from "../drag_events/translate_event.js";

class SelectBrush extends Brush {
	constructor(context) {
		super(context);
	}

	displayButton(button) {
		button.innerText = "(S)elect";
		button.title = "Select Objects";
	}

	getDescription() {
		return "Select/Move";
	}

	async draw(context, position) {
		context;
		position;
	}

	async activate(where) {
		const oldSelectedIds = this.selection.parentNodeIds;

		if(!this.context.hoveringOverSelection()) {
			if(this.context.hoverSelection.exists()) {
				const newSelection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);

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

		const ret = undefined;

		if(this.context.hoveringOverSelection()) {
			ret = new TranslateEvent(this.context, where, Array.from(this.context.selection.getOrigins()));
		}
		else {
			this.context.selection = new Selection(this, []);
		}

		const newSelectedIds = this.selection.parentNodeIds;

		for(const nodeId of oldSelectedIds) {
			if(!newSelectedIds.has(nodeId)) {
				this.recalculateNodesSelected([this.mapper.backend.getNodeRef(nodeId)]);
			}
		}

		for(const nodeId of newSelectedIds) {
			if(!oldSelectedIds.has(nodeId)) {
				this.recalculateNodesSelected([this.mapper.backend.getNodeRef(nodeId)]);
			}
		}
	}
}

export { SelectBrush };

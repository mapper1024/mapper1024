import { Brush } from "./brush.js";
import { Selection } from "../selection.js";
import { TranslateEvent } from "../drag_events/translate_event.js";

class SelectBrush extends Brush {
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
			return new TranslateEvent(this.context, where, this.context.selection.getOrigins());
		}
		else {
			this.context.selection = new Selection(this, []);
		}
	}
}

export { SelectBrush };

import { Brush } from "./brush.js";
import { Selection } from "../selection.js";
import { TranslateEvent } from "../drag_events/translate_event.js";

class SelectBrush extends Brush {
	constructor(context) {
		super(context);
	}

	displayButton(button) {
		button.innerText = "Select";
		button.title = "Select Objects [shortcut: 's']";
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

		let ret;

		if(this.context.hoveringOverSelection()) {
			ret = new TranslateEvent(this.context, where, Array.from(this.context.selection.getOrigins()));
		}
		else {
			this.context.selection = new Selection(this, []);
		}

		return ret;
	}
}

export { SelectBrush };

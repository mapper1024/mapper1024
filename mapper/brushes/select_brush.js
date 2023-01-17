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
						await this.context.updateSelection(await this.context.selection.joinWith(newSelection));
					}
					else {
						await this.context.updateSelection(newSelection);
					}
				}
			}
			else {
				await this.context.updateSelection(new Selection(this.context, []));
			}
		}

		let ret;

		if(this.context.hoveringOverSelection()) {
			ret = new TranslateEvent(this.context, where, Array.from(this.context.selection.getOrigins()));
		}
		else {
			await this.context.updateSelection(new Selection(this, []));
		}

		return ret;
	}

	async getSelectedNodeRef() {
		const originNodeRefs = Array.from(this.context.selection.getOrigins());
		if(originNodeRefs.length === 1) {
			// Exactly one node selected.
			const nodeRef = originNodeRefs[0];
			if(await nodeRef.valid()) {
				return nodeRef;
			}
			else {
				return null;
			}
		}
		else {
			// 0 or 2+ nodes selected, so we can't return just one.
			return null;
		}
	}

	async displaySidebar(brushbar, container) {
		const make = async (nodeRef) => {
			if(nodeRef) {
				container.innerText = `Node #${nodeRef.id}\n${(await nodeRef.getType()).getDescription()}`;
			}
			else {
				container.innerText = "";
			}
		};

		await make(await this.getSelectedNodeRef());
		this.hooks.add("context_selection_change", async () => {
			await make(await this.getSelectedNodeRef());
		});
	}
}

export { SelectBrush };

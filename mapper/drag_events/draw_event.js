import { DragEvent } from "./drag_event.js";
import { BulkAction } from "../actions/bulk_action.js";

class DrawEvent extends DragEvent {
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

export { DrawEvent };

import { DragEvent } from "./drag_event.js";
import { BulkAction } from "../actions/bulk_action.js";

class DrawEvent extends DragEvent {
	constructor(context, startPoint, cumulative) {
		super(context, startPoint);

		this.undoActions = [];
		this.cumulative = cumulative;
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

		if(!this.cumulative) {
			await this.clear();
		}

		this.undoActions.push(await this.trigger(this.cumulative ? this.path.asMostRecent() : this.path));

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

export { DrawEvent };

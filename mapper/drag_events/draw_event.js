import { DragEvent } from "./drag_event.js";
import { BulkAction } from "../actions/bulk_action.js";

class DrawEvent extends DragEvent {
	constructor(context, startPoint) {
		super(context, startPoint);

		this.undoActions = [];
		this.state = [];
	}

	getFirstState() {
		return this.state.length > 0 ? this.state[0] : undefined;
	}

	getLastState() {
		return this.state.length > 0 ? this.state[this.state.length - 1] : undefined;
	}

	pushState(state) {
		this.state.push(state);
	}

	getUndoAction() {
		return new BulkAction(this.context, {
			actions: this.undoActions.splice(0, this.undoActions.length).reverse(),
		});
	}

	async next(nextPoint) {
		super.next(nextPoint);

		this.undoActions.push(await this.trigger());
	}

	async end(endPoint) {
		super.end(endPoint);

		this.undoActions.push(await this.trigger());

		this.context.pushUndo(this.getUndoAction());
	}

	async trigger() {
		return await this.context.brush.trigger(this);
	}

	cancel() {
		this.end(this.path.lastVertex());
	}
}

export { DrawEvent };

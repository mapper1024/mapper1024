import { DragEvent } from "./drag_event.js";
import { BulkAction, TranslateAction } from "../actions/index.js";

class TranslateEvent extends DragEvent {
	constructor(context, startPoint, nodeRefs) {
		super(context, startPoint);

		this.nodeRefs = nodeRefs;

		this.undoActions = [];
	}

	getUndoAction() {
		return new BulkAction(this.context, {
			actions: this.undoActions.splice(0, this.undoActions.length).reverse(),
		});
	}

	async next(nextPoint) {
		super.next(nextPoint);

		const offset = this.context.canvasPathToMap(this.path).lastLine().vector();

		for(const nodeRef of this.nodeRefs) {
			this.undoActions.push(await this.context.performAction(new TranslateAction(this.context, {
				nodeRef: nodeRef,
				offset: offset,
			}), false));
		}
	}

	async end(endPoint) {
		this.next(endPoint);

		this.context.pushUndo(this.getUndoAction());
	}

	cancel() {
		this.context.performAction(this.getUndoAction(), false);
	}
}

export { TranslateEvent };

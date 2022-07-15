import { Path } from "../geometry.js";

class DragEvent {
	constructor(context, startPoint) {
		this.context = context;
		this.path = new Path(startPoint);
		this.done = false;
		this.hoverSelection = this.context.hoverSelection;
	}

	next(nextPoint) {
		this.path.next(nextPoint);
	}

	end(endPoint) {
		this.path.next(endPoint);
		this.done = true;
	}

	cancel() {}

	async getSelectionParent() {
		return await this.hoverSelection.getParent();
	}
}

export { DragEvent };

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
		if(this.hoverSelection.exists()) {
			for(const origin of this.hoverSelection.getOrigins()) {
				const parent = await origin.getParent();
				if(parent && !(await origin.hasChildren())) {
					return parent;
				}
				else {
					return origin;
				}
			}
		}

		return null;
	}
}

export { DragEvent };

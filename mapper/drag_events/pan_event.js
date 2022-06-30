import { DragEvent } from "./drag_event.js";

class PanEvent extends DragEvent {
	next(nextPoint) {
		super.next(nextPoint);
		this.context.scrollOffset = this.context.scrollOffset.subtract(this.path.lastLine().vector());
		this.context.recalculateTilesViewport();
	}
}

export { PanEvent };

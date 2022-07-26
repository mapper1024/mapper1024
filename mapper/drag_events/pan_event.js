import { DragEvent } from "./drag_event.js";

class PanEvent extends DragEvent {
	next(nextPoint) {
		super.next(nextPoint);
		this.context.setScrollOffset(this.context.scrollOffset.subtract(this.path.lastLine().vector()));
	}
}

export { PanEvent };

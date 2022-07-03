import { Brush } from "./brush.js";
import { BulkAction, RemoveAction } from "../actions/index.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { Selection } from "../selection.js";
import { asyncFrom } from "../utils.js";

class DeleteBrush extends Brush {
	getDescription() {
		return `Delete (size ${this.size})`;
	}

	async activate(where) {
		return new DrawEvent(this.context, where);
	}

	async * getNodesInBrush(brushPosition) {
		for await (const nodeRef of this.context.drawnNodes()) {
			if(this.context.mapPointToCanvas((await nodeRef.getCenter())).subtract(brushPosition).length() <= this.getRadius() && await nodeRef.getPNumber("radius") > 0) {
				yield nodeRef;
			}
		}
	}

	async draw(context, position) {
		if(this.context.isKeyDown("Control") || this.sizeRecentlyChanged()) {
			await this.drawAsCircle(context, position);
		}
	}

	async triggerAtPosition(brushPosition) {
		let toRemove;

		if(this.context.isKeyDown("Control")) {
			toRemove = await asyncFrom(this.getNodesInBrush(brushPosition));
		}
		else {
			let selection;

			if(this.context.isKeyDown("Shift")) {
				selection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);
			}
			else {
				selection = this.context.hoverSelection;
			}

			toRemove = selection.getOrigins();
		}

		return new RemoveAction(this.context, {nodeRefs: toRemove});
	}

	async triggerOnPath(path) {
		const actions = [];
		for(const vertex of path.vertices()) {
			actions.push(await this.triggerAtPosition(vertex));
		}
		return new BulkAction(this.context, {actions: actions});
	}

	async trigger(path) {
		return await this.context.performAction(await this.triggerOnPath(path));
	}
}

export { DeleteBrush };

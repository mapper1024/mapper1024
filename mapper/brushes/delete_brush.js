import { Brush } from "./brush.js";
import { BulkAction, RemoveAction } from "../actions/index.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { Selection } from "../selection.js";
import { asyncFrom } from "../utils.js";

class DeleteBrush extends Brush {
	getDescription() {
		return `Delete (radius ${this.sizeInMeters()}m)`;
	}

	displayButton(button) {
		button.innerText = "(D)elete";
		button.title = "Delete Objects";
	}

	async activate(where) {
		return new DrawEvent(this.context, where);
	}

	async * getNodesInBrush(brushPosition) {
		for await (const nodeRef of this.context.drawnNodes()) {
			if(this.context.mapPointToCanvas((await nodeRef.getEffectiveCenter())).subtract(brushPosition).length() <= this.getRadius() && !(await nodeRef.hasChildren())) {
				yield nodeRef;
			}
		}
	}

	async draw(context, position) {
		await this.drawAsCircle(context, position);
	}

	async triggerAtPosition(brushPosition) {
		let toRemove;

		if(this.context.isKeyDown("Shift")) {
			const selection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);
			toRemove = Array.from(selection.getOrigins());
		}
		else {
			toRemove = await asyncFrom(this.getNodesInBrush(brushPosition));
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

	async trigger(drawEvent) {
		const action = await this.triggerOnPath(drawEvent.path.asMostRecent());
		const undoAction = await this.context.performAction(action);
		return undoAction;
	}
}

export { DeleteBrush };

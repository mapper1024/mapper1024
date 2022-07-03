import { Action, BulkAction, NodeCleanupAction, RemoveAction } from "./index.js";

class DrawPathAction extends Action {
	getPathOnMap() {
		return this.options.path.mapOrigin((origin) => origin.add(this.options.scrollOffset)).withBisectedLines(this.options.radius);
	}

	async perform() {
		const placedNodes = [];

		if(this.options.undoParent) {
			placedNodes.push(this.options.parent);
		}

		for(const vertex of this.getPathOnMap().vertices()) {
			placedNodes.push(await this.context.mapper.insertNode(vertex, {
				type: this.options.nodeType,
				radius: this.options.radius,
				parent: this.options.parent,
			}));
		}

		const undoAction = new RemoveAction(this.context, {
			nodeRefs: placedNodes,
		});

		if(this.options.fullCalculation) {
			const undoCleanupAction = await this.context.performAction(new NodeCleanupAction(this.context, {nodeRef: this.options.parent, type: this.options.nodeType}), false);
			return new BulkAction(this.context, {
				actions: [undoCleanupAction, undoAction],
			});
		}
		else {
			return undoAction;
		}
	}

	empty() {
		return false;
	}
}

export { DrawPathAction };

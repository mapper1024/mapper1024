import { Action, BulkAction, NodeCleanupAction, RemoveAction } from "./index.js";

class DrawPathAction extends Action {
	async perform() {
		const path = this.options.path;
		const scrollOffset = this.options.scrollOffset;

		const pathOnMap = path.mapOrigin((origin) => origin.add(scrollOffset)).withBisectedLines(this.options.radius);

		const placedNodes = [];

		if(!this.options.parent) {
			this.options.parent = await this.context.mapper.insertNode(pathOnMap.getCenter(), {
				type: this.options.nodeType,
				radius: 0,
			});

			placedNodes.push(this.options.parent);
		}

		const pathCenter = pathOnMap.getCenter();

		const vertices = Array.from(pathOnMap.vertices()).sort((a, b) => a.subtract(pathCenter).lengthSquared() - b.subtract(pathCenter).lengthSquared());

		const placedVertices = [];

		const radius = this.options.radius;

		placeEachVertex: for(const vertex of vertices) {
			for(const placedVertex of placedVertices) {
				if(placedVertex.point.subtract(vertex).length() < (radius + placedVertex.radius) / 4) {
					continue placeEachVertex;
				}
			}

			if(radius > 0) {
				placedNodes.push(await this.context.mapper.insertNode(vertex, {
					type: this.options.nodeType,
					radius: radius,
					parent: this.options.parent,
				}));

				placedVertices.push({
					point: vertex,
					radius: radius,
				});
			}
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

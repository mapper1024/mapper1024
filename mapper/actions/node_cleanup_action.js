import { Action, SetNodeSpaceAction } from "./index.js";
import { asyncFrom } from "../utils.js";
import { Vector3 } from "../geometry.js";

class NodeCleanupAction extends Action {
	async perform() {
		const vertices = await asyncFrom(this.getAllVertices());

		let sum = Vector3.ZERO;

		for(const vertex of vertices) {
			sum = sum.add(vertex.point);
		}

		let center = Vector3.ZERO;

		if(vertices.length > 0) {
			center = sum.divideScalar(vertices.length);
		}

		let furthest = center;
		for(const vertex of vertices) {
			if(vertex.point.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
				furthest = vertex.point;
			}
		}

		return this.context.performAction(new SetNodeSpaceAction(this.context, {nodeRef: this.options.nodeRef, center: center, radius: furthest.subtract(center).length()}), false);
	}

	async * getAllNodes() {
		for await (const nodeRef of this.options.nodeRef.getAllDescendants()) {
			yield nodeRef;
		}
	}

	async * getAllVertices() {
		for await (const nodeRef of this.getAllNodes()) {
			yield {
				nodeRef: nodeRef,
				point: await nodeRef.getCenter(),
			};
		}
	}
}

export { NodeCleanupAction };

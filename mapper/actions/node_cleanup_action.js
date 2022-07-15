import { Action, RemoveAction } from "./index.js";
import { asyncFrom } from "../utils.js";
import { Vector3 } from "../geometry.js";

class NodeCleanupAction extends Action {
	async perform() {
		const toRemove = new Set();

		const vertices = (await asyncFrom(this.getAllVertices())).sort((a, b) => b.radius - a.radius);

		let count = 0;
		let sum = Vector3.ZERO;

		for(const vertex of vertices) {
			if(!toRemove.has(vertex.nodeRef.id)) {
				count += 1;
				sum = sum.add(vertex.point);
				for(const otherVertex of vertices) {
					if(otherVertex.removable && otherVertex.nodeRef.id !== vertex.nodeRef.id && otherVertex.point.subtract(vertex.point).length() < (vertex.radius + otherVertex.radius) / 4) {
						toRemove.add(otherVertex.nodeRef.id);
					}
				}
			}
		}

		if(await this.options.nodeRef.getRadius() === 0 && count > 0) {
			this.options.nodeRef.setCenter(sum.divideScalar(count));
		}

		return await this.context.performAction(new RemoveAction(this.context, {nodeRefs: [...toRemove].map((id) => this.context.mapper.backend.getNodeRef(id))}), false);
	}

	async * getAllNodes() {
		for await (const nodeRef of this.options.nodeRef.getSelfAndAllDescendants()) {
			if((await nodeRef.getType()).id === this.options.type.id) {
				yield nodeRef;
			}
		}
	}

	async * getAllVertices() {
		for await (const nodeRef of this.getAllNodes()) {
			const radius = await nodeRef.getRadius();
			if(radius > 0) {
				yield {
					nodeRef: nodeRef,
					removable: !(await nodeRef.hasChildren()),
					point: await nodeRef.getCenter(),
					radius: radius,
				};
			}
		}
	}
}

export { NodeCleanupAction };

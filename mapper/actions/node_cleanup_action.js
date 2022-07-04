import { Action, RemoveAction } from "./index.js";
import { asyncFrom } from "../utils.js";

class NodeCleanupAction extends Action {
	async perform() {
		const toRemove = new Set();

		const vertices = (await asyncFrom(this.getAllVertices())).sort((a, b) => b.radius - a.radius);

		for(const vertex of vertices) {
			if(!toRemove.has(vertex.nodeRef.id)) {
				for(const otherVertex of vertices) {
					if(otherVertex.removable && otherVertex.nodeRef.id !== vertex.nodeRef.id && otherVertex.point.subtract(vertex.point).length() < (vertex.radius + otherVertex.radius) / 4) {
						toRemove.add(otherVertex.nodeRef.id);
					}
				}
			}
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

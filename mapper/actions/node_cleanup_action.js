import { Action, SetNodeSpaceAction, BulkAction, RemoveAction, RemoveEdgeAction } from "./index.js";
import { asyncFrom } from "../utils.js";
import { Vector3 } from "../geometry.js";

class NodeCleanupAction extends Action {
	async perform() {
		const toRemove = new Set();
		const mergePairs = [];
		const vertices = await asyncFrom(this.getAllVertices());

		let sum = Vector3.ZERO;
		let count = 0;

		for(const vertex of vertices) {
			if(!toRemove.has(vertex.nodeRef.id)) {
				++count;
				sum = sum.add(vertex.point);
				for(const otherVertex of vertices) {
					if(otherVertex.nodeRef.id !== vertex.nodeRef.id && otherVertex.point.subtract(vertex.point).length() < (vertex.radius + otherVertex.radius) / 4) {
						toRemove.add(otherVertex.nodeRef.id);
						mergePairs.push([vertex.nodeRef, otherVertex.nodeRef]);
					}
				}
			}
		}

		let center = Vector3.ZERO;

		if(count > 0) {
			center = sum.divideScalar(count);
		}

		let furthest = center;
		for(const vertex of vertices) {
			if(!toRemove.has(vertex.nodeRef.id)) {
				if(vertex.point.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
					furthest = vertex.point;
				}
			}
		}

		const newEdges = [];

		for(const mergePair of mergePairs) {
			const target = mergePair[0];
			for(const dirEdgeRef of await(asyncFrom(mergePair[1].getEdges()))) {
				const neighbor = await dirEdgeRef.getDirOtherNode();
				if(target.id !== neighbor.id && !(await this.context.mapper.backend.getEdgeBetween(target.id, neighbor.id))) {
					const edgeRef = await this.context.mapper.backend.createEdge(target.id, neighbor.id);
					newEdges.push(edgeRef);
				}
			}
		}

		const undoNodeAction = await this.context.performAction(new BulkAction(this.context, {actions: [
			new RemoveAction(this.context, {nodeRefs: [...toRemove].map((id) => this.context.mapper.backend.getNodeRef(id))}),
			new SetNodeSpaceAction(this.context, {nodeRef: this.options.nodeRef, center: center, effectiveCenter: center, radius: furthest.subtract(center).length()}),
		]}), false);

		return new BulkAction(this.context, {actions: [undoNodeAction, new RemoveEdgeAction(this.context, {edgeRefs: newEdges})]});
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
				radius: await nodeRef.getRadius(),
				point: await nodeRef.getCenter(),
			};
		}
	}
}

export { NodeCleanupAction };

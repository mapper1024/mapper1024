import { Action, SetNodeSpaceAction, BulkAction, RemoveAction, RemoveEdgeAction } from "./index.js";
import { asyncFrom } from "../utils.js";
import { Vector3 } from "../geometry.js";

/** Cleans up an object node by removing the most point children possible while still retaining the overall shape.
 * Options:
 * - nodeRef: The object {NodeRef} to be cleaned up.
 */
class NodeCleanupAction extends Action {
	async perform() {
		// Node ids to be removed.
		const toRemove = new Set();

		// Pairs of nodeRefs to merge together.
		const mergePairs = [];

		// Get all vertices within the object node.
		const vertices = await asyncFrom(this.getAllPointVertices());

		// Running total of vertex positions.
		let sum = Vector3.ZERO;
		// Count of vertices used.
		let count = 0;

		for(const vertex of vertices) {
			// If we haven't already decided to remove this vertex, count it into the running total of positions.
			if(!toRemove.has(vertex.nodeRef.id)) {
				++count;
				sum = sum.add(vertex.point);

				// For every other vertex, check if its close enough to be merged into this one.
				for(const otherVertex of vertices) {
					if(otherVertex.nodeRef.id !== vertex.nodeRef.id && otherVertex.point.subtract(vertex.point).length() < (vertex.radius + otherVertex.radius) / 4) {
						// If it was close enough, record it to be merged.
						toRemove.add(otherVertex.nodeRef.id);
						mergePairs.push([vertex.nodeRef, otherVertex.nodeRef]);
					}
				}
			}
		}

		// Get average position of remaining vertices.
		let center = Vector3.ZERO;
		if(count > 0) {
			center = sum.divideScalar(count);
		}

		// Get the furthest vertex point away from the center.
		let furthest = center;
		for(const vertex of vertices) {
			if(!toRemove.has(vertex.nodeRef.id)) {
				if(vertex.point.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
					furthest = vertex.point;
				}
			}
		}

		// List of all new edges created by the cleanup.
		const newEdges = [];

		// Merge pairs of vertices together.
		// The target/first vertex remains, and all edges pointing to the second vertex are recreated to point to the target vertex.
		for(const mergePair of mergePairs) {
			const target = mergePair[0];
			for(const neighbor of await(asyncFrom(mergePair[1].getNeighbors()))) {
				if(target.id !== neighbor.id && !(await this.context.mapper.backend.getEdgeBetween(target.id, neighbor.id))) {
					// Create the edge and record it.
					const edgeRef = await this.context.mapper.backend.createEdge(target.id, neighbor.id);
					newEdges.push(edgeRef);
				}
			}
		}

		// Perform the necessary actions and record their undo actions.
		const undoNodeAction = await this.context.performAction(new BulkAction(this.context, {actions: [
			// Remove all the extraneous point/vertex nodes.
			new RemoveAction(this.context, {nodeRefs: [...toRemove].map((id) => this.context.mapper.backend.getNodeRef(id))}),
			// Change the node space of the object node to match its new vertex set.
			new SetNodeSpaceAction(this.context, {nodeRef: this.options.nodeRef, center: center, effectiveCenter: center, radius: furthest.subtract(center).length()}),
		]}), false);

		// Return the undo action, which undoes removing vertices, changing the node space, and adding edges.
		return new BulkAction(this.context, {actions: [undoNodeAction, new RemoveEdgeAction(this.context, {edgeRefs: newEdges})]});
	}

	/**
	 * Get all child nodes of the object node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getAllNodes() {
		for await (const nodeRef of this.options.nodeRef.getAllDescendants()) {
			yield nodeRef;
		}
	}

	/**
	 * Get descriptors for every vertex/point child node in the object node.
	 * A point descriptor has the fields:
	 * - nodeRef: the point node {NodeRef}
	 * - radius: the {number} radius on the map
	 * - point: the {Vector3} center of the node on the map
	 * @returns {AsyncIterable.<Object>} an iterable of point descriptors
	 */
	async * getAllPointVertices() {
		for await (const nodeRef of this.getAllNodes()) {
			if(await nodeRef.getNodeType() === "point") {
				yield {
					nodeRef: nodeRef,
					radius: await nodeRef.getRadius(),
					point: await nodeRef.getCenter(),
				};
			}
		}
	}
}

export { NodeCleanupAction };

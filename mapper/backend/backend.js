import { Point } from "../point.js";
import { EntityRef, NodeRef, EdgeRef, DirEdgeRef } from "./entity.js";
import { asyncFrom } from "../utils.js";

/** Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
 * Most methods here are low-level; users of the backend should use methods from EntityRef and its children which delegate to the MapBackend.
 *
 * Underlying structure:
 * The backend consists of a set of entities, which can have arbitrary properties.
 * A special entity, "global", is used for properties of the whole map.
 * Two types of entities have specific handling to form a graph:
 * "node" - an entity with a parent and positional information.
 * "edge" - an entity connecting two adjacent nodes.
 */
class MapBackend {
	/** Get a number property on an entity.
	 * Has a default implementation based on string properties.
	 * @returns {number}
	 */
	async getPNumber(entityId, propertyName) {
		return parseFloat(await this.getPString(entityId, propertyName));
	}

	/** Set a number property on an entity.
	 * Has a default implementation based on string properties.
	 */
	async setPNumber(entityId, propertyName, value) {
		return this.setPString(entityId, propertyName, value.toString());
	}

	/** Set a Point property on an entity.
	 * Has a default implementation based on string properties.
	 */
	async setPPoint(entityId, propertyName, point) {
		return this.setPString(entityId, propertyName, JSON.stringify(point));
	}

	/** Get a Point property on an entity.
	 * Has a default implementation based on string properties.
	 * @returns {Point}
	 */
	async getPPoint(entityId, propertyName) {
		const object = JSON.parse(await this.getPString(entityId, propertyName));
		return Point.fromJSON(object.x, object.y, object.z);
	}

	/** Get a string property on an entity.
	 * @returns {string}
	 */
	async getPString(entityId, propertyName) {
		entityId;
		propertyName;
		throw "getPString not implemented";
	}

	/** Set a string property on an entity. */
	async setPString(entityId, propertyName, value) {
		entityId;
		propertyName;
		value;
		throw "setPString not implemented";
	}

	/** Create a new entity in the backend.
	 * @param type {string} Type of the new entity.
	 * @returns {EntityRef}
	 */
	async createEntity(type) {
		type;
		throw "createEntity not implemented";
	}

	/** Creates a new "node" entity.
	 * @param parentId {number|undefined} ID of the parent node, or undefined if the node has no parent.
	 * @returns {NodeRef}
	 */
	async createNode(parentId) {
		parentId;
		throw "createNode not implemented";
	}

	/** Get the parent node of a node by ID, or null if the node has no parent.
	 * @returns {NodeRef|null}
	 */
	async getNodeParent(nodeId) {
		nodeId;
		throw "getNodeParent not implemented";
	}

	/** Get all direct children of a node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async getNodeChildren(nodeId) {
		nodeId;
		throw "getNodeChildren not implemented";
	}

	/** Create a new edge between two nodes.
	 * Order of node IDs does not matter.
	 * @param nodeAId {number} The ID of one of the nodes on the edge.
	 * @param nodeBId {number} The ID of the other node on the edge.
	 * @returns {EdgeRef} A reference to the new edge.
	 */
	async createEdge(nodeAId, nodeBId) {
		nodeAId;
		nodeBId;
		throw "createEdge not implemented";
	}

	/** Get all edges attached to a node.
	 * @returns {AsyncIterable.<EdgeRef>}
	 */
	async getNodeEdges(nodeId) {
		nodeId;
		throw "getNodeEdges not implemented";
	}

	/** Get the two nodes attached to an edge, in no particular order.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async getEdgeNodes(edgeId) {
		edgeId;
		throw "getEdgeNodes not implemented";
	}

	/** Given an edge and one of the nodes on the edge, get the other node on the edge.
	 * @param edgeId {number}
	 * @param nodeId {number}
	 * Has a default implementation based on #getEdgeNodes().
	 * @returns {NodeRef}
	 */
	async getEdgeOtherNode(edgeId, nodeId) {
		const [nodeA, nodeB] = await asyncFrom(this.getEdgeNodes(edgeId));
		return (nodeA.id == nodeId) ? nodeB : nodeA;
	}

	/** Remove an edge from the backend.
	 * Has a default implementation that just removes the entity.
	 */
	async removeEdge(edgeId) {
		return this.removeEntity(edgeId);
	}

	/** Remove a node from the backend.
	 * Has a default implementation that just removes the entity.
	 */
	async removeNode(nodeId) {
		return this.removeEntity(nodeId);
	}

	/** Check if an entity exists.
	 * @returns {boolean}
	 */
	async entityExists(entityId) {
		entityId;
		throw "entityExists not implemented";
	}

	/** Remove an entity from the backend.
	 * This method should work to remove any entity.
	 * However, calling code should use #removeEdge() and #removeNode() when applicable instead, for potential optimization purposes.
	 */
	async removeEntity(entityId) {
		entityId;
		throw "removeEntity not implemented";
	}

	/** Flush the backend to storage.
	 * This may happen automatically, but flush forces it.
	 * Has a default implementation that does nothing.
	 */
	async flush() {
	}

	/** Create an EntityRef to an entity in this backend.
	 * Use getNodeRef, getEdgeRef, or getDirEdgeRef for greater type-specific functionality if the entity is a node or edge.
	 */
	getEntityRef(id) {
		return new EntityRef(id, this);
	}

	/** Create a NodeRef to a node in this backend. */
	getNodeRef(id) {
		return new NodeRef(id, this);
	}

	/** Create an EdgeRef to an edge in this backend. */
	getEdgeRef(id) {
		return new EdgeRef(id, this);
	}

	/** Create a DirEdgeRef to an edge in this backend, starting from the specified node.
	 * @param id {number} The ID of the edge to get.
	 * @param startId {number} The ID of a node attached to this edge.
	 * @returns {DirEdgeRef} Starting from the specified start ID.
	 */
	getDirEdgeRef(id, startId) {
		return new DirEdgeRef(id, startId, this);
	}

	getNodesInArea(a, b) {
		a;
		b;
		throw "getNodesInArea not implemented";
	}

	getEdgeBetween(nodeAId, nodeBId) {
		nodeAId;
		nodeBId;
		throw "getEdgeBetween not implemented";
	}

	async * getAdjacentNodes(nodeRef, blendDistance) {
		const center = await nodeRef.center();
		const distance = Point.scalarMultiply(new Point(1, 1, 1), blendDistance);
		for await (const otherNodeRef of this.getNodesInArea(Point.subtract(center, distance), Point.add(center, distance))) {
			if(otherNodeRef.id !== nodeRef.id) {
				yield otherNodeRef;
			}
		}
	}

	async * getConnectedNodes(nodeRef) {
		for await (const dirEdgeRef of this.getNodeEdges(nodeRef.id)) {
			yield await dirEdgeRef.getDirOtherNode();
		}
	}

	async * getIntersectingEdges(edgeRef, blendDistance) {
		const [cornerA, cornerB] = await edgeRef.getCorners();
		const [centerA, centerB] = await asyncFrom(edgeRef.getNodes(), async nodeRef => await nodeRef.center());
		const centerMin = Point.min(centerA, centerB);
		const centerMax = Point.max(centerA, centerB);
		const distance = Point.scalarMultiply(new Point(1, 1, 1), blendDistance);

		const seen = {
			[edgeRef.id]: true,
		};

		for await (const nodeRef of this.getNodesInArea(Point.subtract(centerMin, distance), Point.add(centerMax, distance))) {
			for await (const dirEdgeRef of nodeRef.getEdges()) {
				if(!seen[dirEdgeRef.id]) {
					seen[dirEdgeRef.id] = true;

					const [otherCornerA, otherCornerB] = await dirEdgeRef.getCorners();

					if(Point.lineIntersects(cornerA, cornerB, otherCornerA, otherCornerB)) {
						yield dirEdgeRef;
					}
				}
			}
		}
	}
}

export { MapBackend };

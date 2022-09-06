import { Vector3, Box3 } from "../geometry.js";
import { EntityRef, NodeRef, EdgeRef, DirEdgeRef } from "./entity.js";
import { HookContainer } from "../hook_container.js";
import { asyncFrom } from "../utils.js";
import { NodeTypeRegistry } from "../node_type.js";

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
	constructor() {
		this.loaded = false;
		this.hooks = new HookContainer();
		this.nodeTypeRegistry = new NodeTypeRegistry();
		this.entityCache = {};
	}

	getEntityCache(id) {
		let cache = this.entityCache[id];
		if(cache === undefined) {
			cache = this.entityCache[id] = {
				properties: {},
			};
		}
		return cache;
	}

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

	/** Set a Vector3 property on an entity.
	 * Has a default implementation based on string properties.
	 */
	async setPVector3(entityId, propertyName, v) {
		return this.setPString(entityId, propertyName, JSON.stringify(v));
	}

	/** Get a Vector3 property on an entity.
	 * Has a default implementation based on string properties.
	 * @returns {Vector3}
	 */
	async getPVector3(entityId, propertyName) {
		const object = JSON.parse(await this.getPString(entityId, propertyName));
		return Vector3.fromJSON(object.x, object.y, object.z);
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
	 * @param nodeType {string} Type of the node. "object" or "point".
	 * @returns {NodeRef}
	 */
	async createNode(parentId, nodeType) {
		parentId;
		nodeType;
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

	/** Check if a node has any children.
	 * Has a default implementation based on #getNodeChildren().
	 * @returns {boolean}
	 */
	async nodeHasChildren(nodeId) {
		return (await asyncFrom(this.getNodeChildren(nodeId))).length > 0;
	}

	/** Get a node's type.
	 * @returns {string}
	 */
	async getNodeType(nodeId) {
		nodeId;
		throw "getNodeType not implemented";
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

	/** Get all nodes within a spatial box.
	 * @param box {Box3} The box to find nodes within.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	getNodesInArea(box) {
		box;
		throw "getNodesInArea not implemented";
	}

	/** Get all nodes in or near a spatial box (according to their radii).
	 * @param box {Box3} The box to find nodes within or near.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	getNodesTouchingArea(box) {
		box;
		throw "getNodesTouchingArea not implemented";
	}

	/** Get the edge between two nodes, if it exists.
	 * @param nodeAId {number} The ID of one of the nodes on the edge to find.
	 * @param nodeBId {number} The ID of the other node on the edge to find.
	 * @returns {EdgeRef}
	 */
	getEdgeBetween(nodeAId, nodeBId) {
		nodeAId;
		nodeBId;
		throw "getEdgeBetween not implemented";
	}

	/** Get all nearby nodes within a specified blend distance of the specified node.
	 * Has a default implementation based on #getNodesInArea().
	 * @param nodeRef {NodeRef} The node that is the spatial center of the search.
	 * @param blendDistance {number} How far out to look for nodes? (Necessary to avoid searching the entire map.)
	 * @returns {AsyncIterable.<NodeRef>} All the discovered nodes. Does not include the original node.
	 */
	async * getNearbyNodes(nodeRef, blendDistance) {
		for await (const otherNodeRef of this.getNodesInArea(Box3.fromRadius(await nodeRef.getCenter(), blendDistance))) {
			if(otherNodeRef.id !== nodeRef.id) {
				yield otherNodeRef;
			}
		}
	}

	/** Get all nodes connected to the specified node by one level of edges (that is, one edge).
	 * Has a default implementation based on #getNodeEdges().
	 * @param nodeRef {NodeRef} The node to search for connections on.
	 * @returns {AsyncIterable.<NodeRef>} The connected nodes.
	 */
	async * getConnectedNodes(nodeRef) {
		for await (const dirEdgeRef of this.getNodeEdges(nodeRef.id)) {
			yield await dirEdgeRef.getDirOtherNode();
		}
	}

	/** Get all edges within a specified blend distance that intersect with the given edge.
	 * Has a default implementation based on #getNodesInArea() and #NodeRef.getEdges().
	 * @param edgeRef {EdgeRef} The edge to search for intersections on.
	 * @param blendDistance {number} How far out to search for intersections? (Necessary to avoid searching the entire map.)
	 * @returns {AsyncIterable.<EdgeRef>} Each intersecting edge found.
	 */
	async * getIntersectingEdges(edgeRef, blendDistance) {
		const line = await edgeRef.getLine();
		const distance = Vector3.UNIT.multiplyScalar(blendDistance);

		const seen = {
			[edgeRef.id]: true,
		};

		for await (const nodeRef of this.getNodesInArea(new Box3(line.fullMin().subtract(distance), line.fullMax().add(distance)))) {
			for await (const dirEdgeRef of nodeRef.getEdges()) {
				if(!seen[dirEdgeRef.id]) {
					seen[dirEdgeRef.id] = true;

					if(line.intersects2(await dirEdgeRef.getLine())) {
						yield dirEdgeRef;
					}
				}
			}
		}
	}
}

export { MapBackend };

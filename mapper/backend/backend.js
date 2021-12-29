import { Point } from "../point.js";
import { EntityRef, NodeRef, EdgeRef, DirEdgeRef } from "./entity.js";
import { asyncFrom } from "../utils.js";

/** Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
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

	/** Get a Point property on an entity.
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
		throw "not implemented";
	}

	/** Set a string property on an entity. */
	async setPString(entityId, propertyName, value) {
		entityId;
		propertyName;
		value;
		throw "not implemented";
	}

	/** Create a new entity in the backend.
	 * @param type {string} Type of the new entity.
	 * @returns {EntityRef}
	 */
	async createEntity(type) {
		type;
		throw "not implemented";
	}

	/** Creates a new "node" entity.
	 * @param parentId {number|undefined} ID of the parent node, or undefined if the node has no parent.
	 * @returns {NodeRef}
	 */
	async createNode(parentId) {
		parentId;
		throw "not implemented";
	}

	/** Get the parent node of a node by ID, or null if the node has no parent.
	 * @returns {NodeRef|null}
	 */
	async getNodeParent(nodeId) {
		nodeId;
		throw "not implemented";
	}

	/** Get all direct children of a node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async getNodeChildren(nodeId) {
		nodeId;
		throw "not implemented";
	}

	async createEdge(nodeAId, nodeBId) {
		nodeAId;
		nodeBId;
		throw "not implemented";
	}

	async getNodeEdges(nodeId) {
		nodeId;
		throw "not implemented";
	}

	async getEdgeNodes(edgeId) {
		edgeId;
		throw "not implemented";
	}

	async getEdgeOtherNode(edgeId, nodeId) {
		const [nodeA, nodeB] = await asyncFrom(this.getEdgeNodes(edgeId));
		return (nodeA.id == nodeId) ? nodeB : nodeA;
	}

	async removeEdge(edgeId) {
		return this.removeEntity(edgeId);
	}

	async removeNode(nodeId) {
		return this.removeEntity(nodeId);
	}

	async entityExists(entityId) {
		entityId;
		throw "not implemented";
	}

	async removeEntity(entityId) {
		entityId;
		throw "not implemented";
	}

	/** Flush the backend to storage.
	 * This may happen automatically, but flush forces it. */
	async flush() {
		// Default no action needed.
	}

	getEntityRef(id) {
		return new EntityRef(id, this);
	}

	getNodeRef(id) {
		return new NodeRef(id, this);
	}

	getEdgeRef(id) {
		return new EdgeRef(id, this);
	}

	getDirEdgeRef(id, startId) {
		return new DirEdgeRef(id, startId, this);
	}
}

export { MapBackend };

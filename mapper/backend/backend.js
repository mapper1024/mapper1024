import { Point } from "../point.js";

import { EntityRef, NodeRef, EdgeRef, DirEdgeRef } from "./entity.js";

/* Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
 */
class MapBackend {
	async getPNumber(entityId, propertyName) {
		return parseFloat(await this.getPString(entityId, propertyName));
	}

	async setPNumber(entityId, propertyName, value) {
		return this.setPString(entityId, propertyName, value.toString());
	}

	async setPPoint(entityId, propertyName, point) {
		return this.setPString(entityId, propertyName, JSON.stringify(point));
	}

	async getPPoint(entityId, propertyName) {
		const object = JSON.parse(await this.getPString(entityId, propertyName));
		return Point.fromJSON(object.x, object.y, object.z);
	}

	async getPString(entityId, propertyName) {
		entityId;
		propertyName;
		throw "not implemented";
	}

	async setPString(entityId, propertyName, value) {
		entityId;
		propertyName;
		value;
		throw "not implemented";
	}

	async createEntity(type) {
		type;
		throw "not implemented";
	}

	async createNode(parentId) {
		parentId;
		throw "not implemented";
	}

	async getNodeParent(nodeId) {
		nodeId;
		throw "not implemented";
	}

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
		const [nodeA, nodeB] = await this.getEdgeNodes(edgeId);
		return (nodeA.id == nodeId) ? nodeB : nodeA;
	}

	async removeEdge(edgeId) {
		return this.removeEntity(edgeId);
	}

	async removeNode(nodeId) {
		return this.removeEntity(nodeId);
	}

	async removeEntity(entityId) {
		entityId;
		throw "not implemented";
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

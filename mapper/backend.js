import { Point } from "./point.js";

class EntityRef {
	constructor(id, backend) {
		this.id = id;
		this.backend = backend;
	}

	async getPNumber(propertyName) {
		return this.backend.getPNumber(this.id, propertyName);
	}

	async getPString(propertyName) {
		return this.backend.getPString(this.id, propertyName);
	}

	async getPPoint(propertyName) {
		return this.backend.getPPoint(this.id, propertyName);
	}

	async setPNumber(propertyName, value) {
		return this.backend.setPNumber(this.id, propertyName, value);
	}

	async setPString(propertyName, value) {
		return this.backend.setPString(this.id, propertyName, value);
	}

	async setPPoint(propertyName, point) {
		return this.backend.setPPoint(this.id, propertyName, point);
	}
}

class NodeRef extends EntityRef {
	async center() {
		return this.getPPoint("center");
	}

	async getNeighbors() {
		return this.backend.getNeighbors(this.id);
	}

	async removeNeighbor(neighborId) {
		return this.backend.removeNeighbor(this.id, neighborId);
	}
}

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

	async getNeighbors(nodeId) {
		nodeId;
		throw "not implemented";
	}

	async removeNeighbor(nodeIdA, nodeIdB) {
		nodeIdA;
		nodeIdB;
		throw "not implemented";
	}

	getEntityRef(id) {
		return new EntityRef(id, this);
	}

	getNodeRef(id) {
		return new NodeRef(id, this);
	}
}

export { MapBackend };

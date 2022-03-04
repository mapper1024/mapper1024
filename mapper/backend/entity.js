class EntityRef {
	constructor(id, backend) {
		this.id = id;
		this.backend = backend;
	}

	async exists() {
		return this.backend.entityExists(this.id);
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

	async remove() {
		return this.backend.removeEntity(this.id);
	}
}

class NodeRef extends EntityRef {
	async getParent() {
		return this.backend.getNodeParent(this.id);
	}

	async * getChildren() {
		yield* this.backend.getNodeChildren(this.id);
	}

	async setCenter(point) {
		return this.setPPoint("center", point);
	}

	async center() {
		return this.getPPoint("center");
	}

	async * getEdges() {
		yield* this.backend.getNodeEdges(this.id);
	}

	async remove() {
		return this.backend.removeNode(this.id);
	}
}

class EdgeRef extends EntityRef {
	async * getNodes() {
		yield* this.backend.getEdgeNodes(this.id);
	}

	async getOtherNode(startId) {
		return this.backend.getEdgeOtherNode(this.id, startId);
	}

	async remove() {
		return this.backend.removeEdge(this.id);
	}
}

class DirEdgeRef extends EdgeRef {
	constructor(id, startId, backend) {
		super(id, backend);
		this.startId = startId;
	}

	async getDirOtherNode() {
		return this.getOtherNode(this.startId);
	}
}

export { EntityRef, NodeRef, EdgeRef, DirEdgeRef };

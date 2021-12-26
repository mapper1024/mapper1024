function new_unique_id() {
	return Date.now().toString(32) + ":" + Math.random().toString(32)
}

class Point {
	constructor(x, y, z) {
		this.x = x
		this.y = y
		this.z = z
	}
}

class NodeRef {
	constructor(id, backend) {
		this.id = id
		this.backend = backend
	}

	async getNeighbors() {
		return this.backend.getNeighbors(this.id)
	}

	async removeNeighbor(neighborId) {
		return this.backend.removeNeighbor(this.id, neighborId)
	}

	async getPNumber(propertyName) {
		return this.backend.getPNumber(this.id, propertyName)
	}

	async getPString(propertyName) {
		return this.backend.getPString(this.id, propertyName)
	}

	async getPPoint(propertyName) {
		const [x, y, z] = await Promise.all([this.getPNumber(propertyName + ".x"), this.getPNumber(propertyName + ".y"), this.getPNumber(propertyName + ".z")])
		return new Point(x, y, z)
	}

	async setPNumber(propertyName, value) {
		return this.backend.setPNumber(this.id, propertyName, value)
	}

	async setPString(propertyName, value) {
		return this.backend.setPString(this.id, propertyName, value)
	}

	async setPPoint(propertyName, point) {
		return Promise.all([
			this.setPNumber(propertyName + ".x", point.x),
			this.setPNumber(propertyName + ".y", point.y),
			this.setPNumber(propertyName + ".z", point.z),
		])
	}

	async center() {
		return this.getPPoint("center")
	}
}

/* Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
 */
class MapBackend {
	async getPNumber(entity, propertyName) {
		return parseFloat(await this.getPString(entity, propertyName))
	}

	async setPNumber(entity, propertyName, value) {
		return this.setPString(entity, propertyName, value.toString())
	}

	getPString(entity, propertyName) {
		throw "not implemented"
	}

	setPString(entity, propertyName, value) {
		throw "not implemented"
	}

	getNeighbors(nodeId) {
		throw "not implemented"
	}

	removeNeighbor(nodeIdA, nodeIdB) {
		throw "not implemented"
	}

	getNodeRef(id) {
		return new NodeRef(id, this)
	}
}

export { MapBackend };

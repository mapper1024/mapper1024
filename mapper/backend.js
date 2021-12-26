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

	getNeighbors() {
		return this.backend.getNeighbors(this.id)
	}

	getPNumber(propertyName) {
		return this.backend.getPNumber(this.id, propertyName)
	}

	getPString(propertyName) {
		return this.backend.getPString(this.id, propertyName)
	}

	getPPoint(propertyName) {
		return new Point(this.getPNumber(propertyName + ".x"), this.getPNumber(propertyName + ".y"), this.getPNumber(propertyName + ".z"))
	}

	setPPoint(propertyName, point) {
		this.setPNumber(propertyName + ".x", point.x)
		this.setPNumber(propertyName + ".y", point.y)
		this.setPNumber(propertyName + ".z", point.z)
	}

	center() {
		return this.getPPoint("center")
	}
}

/* Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
 */
class MapBackend {
	getPNumber(entity, propertyName) {
		return parseFloat(this.getPString(entity, propertyName))
	}

	getPString(entity, propertyName) {
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

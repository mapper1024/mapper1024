import { Line3 } from "../geometry.js";
import { asyncFrom } from "../utils.js";

/** Generic reference to an entity.
 * Do not construct manually, use backend methods. */
class EntityRef {
	constructor(id, backend) {
		this.id = id;
		this.backend = backend;
		this.cache = this.backend.getEntityCache(id);
		this.propertyCache = this.cache.properties;
	}

	/** Check if this entity exists in the database.
	 * @returns {boolean}
	 */
	async exists() {
		return this.backend.entityExists(this.id);
	}

	/** Check if this entity is valid (i.e. not deleted).
	 * @returns {boolean}
	 */
	async valid() {
		return this.backend.entityValid(this.id);
	}

	/** Get a number property. */
	async getPNumber(propertyName) {
		let value = this.propertyCache[propertyName];
		if(value === undefined) {
			value = this.propertyCache[propertyName] = this.backend.getPNumber(this.id, propertyName);
		}
		return value;
	}

	/** Get a string property. */
	async getPString(propertyName) {
		let value = this.propertyCache[propertyName];
		if(value === undefined) {
			value = this.propertyCache[propertyName] = this.backend.getPString(this.id, propertyName);
		}
		return value;
	}

	/** Get a Vector3 property. */
	async getPVector3(propertyName) {
		let value = this.propertyCache[propertyName];
		if(value === undefined) {
			value = this.propertyCache[propertyName] = this.backend.getPVector3(this.id, propertyName);
		}
		return value;
	}

	/** Set a number property. */
	async setPNumber(propertyName, value) {
		this.propertyCache[propertyName] = value;
		return this.backend.setPNumber(this.id, propertyName, value);
	}

	/** Set a string property. */
	async setPString(propertyName, value) {
		this.propertyCache[propertyName] = value;
		return this.backend.setPString(this.id, propertyName, value);
	}

	/** Set a Vector3 property. */
	async setPVector3(propertyName, v) {
		this.propertyCache[propertyName] = v;
		return this.backend.setPVector3(this.id, propertyName, v);
	}

	/** Remove this entity from the database. */
	async remove() {
		return this.backend.removeEntity(this.id);
	}

	async unremove() {
		return this.backend.unremoveEntity(this.id);
	}
}

/** Reference to a node entity.
 * Do not construct manually, use backend methods. */
class NodeRef extends EntityRef {
	constructor(id, backend) {
		super(id, backend);
	}

	/** Called when the node is created. */
	async create() {
		this.cache.edges = [];
		this.cache.neighbors = [];
		await this.clearParentCache();
	}

	async clearParentCache() {
		const parent = await this.getParent();
		if(parent) {
			delete parent.cache.children;
		}
	}

	async clearNeighborCache() {
		for await (const nodeRef of this.getSelfAndNeighbors()) {
			delete nodeRef.cache.edges;
			delete nodeRef.cache.neighbors;
		}
	}

	/** Get the base type of this node. See backend getNodeType().
	 * @returns {string}
	 */
	async getNodeType() {
		let type = this.cache.type;
		if(type === undefined) {
			type = this.cache.type = await this.backend.getNodeType(this.id);
		}
		return type;
	}

	/** Get the parent node of this node, if it exists.
	 * @returns {NodeRef|null} The parent node, or null if there is no parent.
	 */
	async getParent() {
		let parent = this.cache.parent;
		if(parent === undefined) {
			parent = this.cache.parent = this.backend.getNodeParent(this.id);
		}
		return parent;
	}

	/** Get all children of this node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getChildren() {
		let children = this.cache.children;
		if(children === undefined) {
			children = this.cache.children = await asyncFrom(this.backend.getNodeChildren(this.id));
		}

		yield* children;
	}

	async hasChildren() {
		return this.backend.nodeHasChildren(this.id);
	}

	async * getAllDescendants() {
		for (const child of await asyncFrom(this.getChildren())) {
			yield child;
			yield* child.getAllDescendants();
		}
	}

	async * getSelfAndAllDescendants() {
		yield this;
		for (const child of await asyncFrom(this.getChildren())) {
			yield* child.getSelfAndAllDescendants();
		}
	}

	async * getNeighbors() {
		let neighbors = this.cache.neighbors;

		if(neighbors === undefined) {
			neighbors = this.cache.neighbors = await asyncFrom(this.getEdges(), async (edge) => await edge.getDirOtherNode());
		}

		yield* neighbors;
	}

	async * getSelfAndNeighbors() {
		yield this;
		yield* this.getNeighbors();
	}

	/** Set the "center" property of this node.
	 * @param v {Vector3}
	 */
	async setCenter(v) {
		return this.setPVector3("center", v);
	}

	/** Get the "center" property of this node.
	 * @returns {Vector3}
	 */
	async getCenter() {
		return this.getPVector3("center");
	}

	async setEffectiveCenter(v) {
		return this.setPVector3("eCenter", v);
	}

	async getEffectiveCenter() {
		return this.getPVector3("eCenter");
	}

	async setType(type) {
		return this.setPString("type", type.id);
	}

	async getType() {
		return this.backend.nodeTypeRegistry.get(await this.getPString("type"));
	}

	async setRadius(radius) {
		return this.setPNumber("radius", radius);
	}

	async getRadius() {
		return this.getPNumber("radius");
	}

	async getLayer() {
		const layerId = await this.getPString("layer");
		return layerId ? this.backend.layerRegistry.get(layerId) : this.backend.layerRegistry.getDefault();
	}

	async setLayer(layer) {
		return this.setPString("layer", layer.id);
	}

	/** Get all edges connected to this node.
	 * @returns {AsyncIterable.<DirEdgeRef>} all the edges, with direction information from this node.
	 */
	async * getEdges() {
		let edges = this.cache.edges;
		if(edges === undefined) {
			edges = this.cache.edges = await asyncFrom(this.backend.getNodeEdges(this.id));
		}
		yield* edges;
	}

	/** Remove this entity from the database. */
	async remove() {
		await this.clearParentCache();
		await this.clearNeighborCache();
		return this.backend.removeNode(this.id);
	}

	async unremove() {
		super.unremove();
		await this.clearParentCache();
		await this.clearNeighborCache();
	}
}

/** Reference to an edge entity.
 * Do not construct manually, use backend methods. */
class EdgeRef extends EntityRef {
	/** Called when the node is created. */
	async create() {
		await this.addToNeighborCache();
	}

	async addToNeighborCache() {
		const nodes = await asyncFrom(this.getNodes());
		for(let i = 0; i < nodes.length; i++) {
			const nodeRef = nodes[i];

			const edges = nodeRef.cache.edges;
			if(edges) {
				edges.push(this.backend.getDirEdgeRef(this.id, nodeRef.id));
			}

			const neighbors = nodeRef.cache.neighbors;
			if(neighbors) {
				neighbors.push(nodes[(i + 1) % 2]);
			}
		}
	}

	async clearNeighborCache() {
		for await (const nodeRef of this.getNodes()) {
			delete nodeRef.cache.edges;
			delete nodeRef.cache.neighbors;
		}
	}

	/** Get the (two) nodes connected to this edge.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getNodes() {
		yield* this.backend.getEdgeNodes(this.id);
	}

	/** Get the other node connected to this edge, given one of the connected nodes.
	 * @param startId {number} the known node ID.
	 * @returns {NodeRef} the other node connected to this edge.
	 */
	async getOtherNode(startId) {
		return this.backend.getEdgeOtherNode(this.id, startId);
	}

	/** Get the spatial line between the centers of each node on this edge.
	 * @returns {Line3}
	 */
	async getLine() {
		const [a, b] = await asyncFrom(this.getNodes(), async nodeRef => nodeRef.getCenter());
		return new Line3(a, b);
	}

	async remove() {
		await this.clearNeighborCache();
		return this.backend.removeEdge(this.id);
	}

	async unremove() {
		super.unremove();
		await this.clearNeighborCache();
	}
}

/** {EdgeRef} with directional information (what node it starts from).
 * While edges are bidirectional, the DirEdgeRef can simplify working with other nodes when only one side of the edge is known.
 */
class DirEdgeRef extends EdgeRef {
	constructor(id, startId, backend) {
		super(id, backend);
		this.startId = startId;
	}

	/** Get the other (unknown) node from this reference.
	 * @returns {NodeRef}
	 */
	async getDirOtherNode() {
		return this.getOtherNode(this.startId);
	}
}

export { EntityRef, NodeRef, EdgeRef, DirEdgeRef };

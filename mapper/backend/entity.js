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

	/** Restore this entity to the database if it was previously removed. */
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
			parent = this.cache.parent = await this.backend.getNodeParent(this.id);
		}
		return parent;
	}

	async setParent(parent) {
		await this.clearParentCache();

		this.cache.parent = parent;
		await this.backend.setNodeParent(this.id, parent.id);

		await this.clearParentCache();
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

	/** Check if this node has any children.
	 * @returns {boolean} does this node have children?
	 */
	async hasChildren() {
		return await this.backend.nodeHasChildren(this.id);
	}

	/** Iterate through all children, grandchildren, and so forth of this node, recursively.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getAllDescendants() {
		for (const child of await asyncFrom(this.getChildren())) {
			yield child;
			yield* child.getAllDescendants();
		}
	}

	/** Iterate through all children, grandchildren, and so forth of this node, recursively. Includes this node itself.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getSelfAndAllDescendants() {
		yield this;
		for (const child of await asyncFrom(this.getChildren())) {
			yield* child.getSelfAndAllDescendants();
		}
	}

	/** Get all neighbors of this node --- those nodes connected by edges to this node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getNeighbors() {
		let neighbors = this.cache.neighbors;

		if(neighbors === undefined) {
			neighbors = this.cache.neighbors = await asyncFrom(this.getEdges(), async (edge) => await edge.getDirOtherNode());
		}

		yield* neighbors;
	}

	/** Get all neighbors of this node --- those nodes connected by edges to this node. Includes this node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
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

	/** Set the effective center property of this node --- where it is actually displayed.
	 * @param v {Vector3}
	 */
	async setEffectiveCenter(v) {
		return this.setPVector3("eCenter", v);
	}

	/** Get the effective center property of this node --- where it is actually displayed.
	 * @returns {Vector3}
	 */
	async getEffectiveCenter() {
		return this.getPVector3("eCenter");
	}

	/** Set the type of this node.
	 * @param type {NodeType}
	 */
	async setType(type) {
		return this.setPString("type", type.id);
	}

	/** Get the type of this node from the map backend node type registry.
	 * @returns {NodeType}
	 */
	async getType() {
		return this.backend.nodeTypeRegistry.get(await this.getPString("type"));
	}

	/** Set the radius of the node. */
	async setRadius(radius) {
		return this.setPNumber("radius", radius);
	}

	/** Get the radius of the node */
	async getRadius() {
		return this.getPNumber("radius");
	}

	/** Get the layer of this node from the map backend layer registry.
	 * Returns the default layer if no layer is specified.
	 * @returns {Layer}
	 */
	async getLayer() {
		const layerId = await this.getPString("layer");
		return layerId ? this.backend.layerRegistry.get(layerId) : this.backend.layerRegistry.getDefault();
	}

	/** Set the layer of this node.
	 * @param layer {Layer}
	 */
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

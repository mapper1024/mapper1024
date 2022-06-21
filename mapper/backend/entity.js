import { Line3 } from "../geometry.js";
import { asyncFrom } from "../utils.js";

/** Generic reference to an entity.
 * Do not construct manually, use backend methods. */
class EntityRef {
	constructor(id, backend) {
		this.id = id;
		this.backend = backend;
	}

	/** Check if this entity exists in the database.
	 * @returns {boolean}
	 */
	async exists() {
		return this.backend.entityExists(this.id);
	}

	/** Get a number property. */
	async getPNumber(propertyName) {
		return this.backend.getPNumber(this.id, propertyName);
	}

	/** Get a string property. */
	async getPString(propertyName) {
		return this.backend.getPString(this.id, propertyName);
	}

	/** Get a Vector3 property. */
	async getPVector3(propertyName) {
		return this.backend.getPVector3(this.id, propertyName);
	}

	/** Set a number property. */
	async setPNumber(propertyName, value) {
		return this.backend.setPNumber(this.id, propertyName, value);
	}

	/** Set a string property. */
	async setPString(propertyName, value) {
		return this.backend.setPString(this.id, propertyName, value);
	}

	/** Set a Vector3 property. */
	async setPVector3(propertyName, v) {
		return this.backend.setPVector3(this.id, propertyName, v);
	}

	/** Remove this entity from the database. */
	async remove() {
		return this.backend.removeEntity(this.id);
	}
}

/** Reference to a node entity.
 * Do not construct manually, use backend methods. */
class NodeRef extends EntityRef {
	/** Get the parent node of this node, if it exists.
	 * @returns {NodeRef|null} The parent node, or null if there is no parent.
	 */
	async getParent() {
		return this.backend.getNodeParent(this.id);
	}

	/** Get all children of this node.
	 * @returns {AsyncIterable.<NodeRef>}
	 */
	async * getChildren() {
		yield* this.backend.getNodeChildren(this.id);
	}

	async * getAllDescendants() {
		for (const child of await asyncFrom(this.getChildren())) {
			yield child;
			yield* child.getAllDescendants();
		}
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
	async center() {
		return this.getPVector3("center");
	}

	/** Get all edges connected to this node.
	 * @returns {AsyncIterable.<DirEdgeRef>} all the edges, with direction information from this node.
	 */
	async * getEdges() {
		yield* this.backend.getNodeEdges(this.id);
	}

	async remove() {
		return this.backend.removeNode(this.id);
	}
}

/** Reference to an edge entity.
 * Do not construct manually, use backend methods. */
class EdgeRef extends EntityRef {
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
		const [a, b] = await asyncFrom(this.getNodes(), async nodeRef => nodeRef.center());
		return new Line3(a, b);
	}

	async remove() {
		return this.backend.removeEdge(this.id);
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

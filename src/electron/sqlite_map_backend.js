import { MapBackend, Point } from "../../mapper/index.js";
import Database from "better-sqlite3";

class SQLiteMapBackend extends MapBackend {
	constructor(filename) {
		super();
		this.filename = filename;
	}

	async load() {
		this.db = Database(this.filename);

		this.db.pragma("foreign_keys = ON");

		this.db.prepare("CREATE TABLE IF NOT EXISTS entity (entityid INTEGER PRIMARY KEY, type TEXT)").run();
		this.db.prepare("CREATE TABLE IF NOT EXISTS node (entityid INT PRIMARY KEY, parentid INT, FOREIGN KEY (entityid) REFERENCES entity(entityid), FOREIGN KEY (parentid) REFERENCES entity(entityid) ON DELETE CASCADE)").run();
		this.db.prepare("CREATE TABLE IF NOT EXISTS connection (edgeid INT, nodeid INT, PRIMARY KEY (edgeid, nodeid) FOREIGN KEY (edgeid) REFERENCES entity(entityid) ON DELETE CASCADE, FOREIGN KEY (nodeid) REFERENCES entity(entityid) ON DELETE CASCADE)").run();

		/* Each property can be either a
		 * string
		 * number (real float)
		 * point (x, y, and z real float)
		 */
		this.db.prepare("CREATE TABLE IF NOT EXISTS property (entityid INT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entityid, property), FOREIGN KEY (entityid) REFERENCES entity(entityid) ON DELETE CASCADE)").run();

		this.s_gpn = this.db.prepare("SELECT v_number FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spn = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_number) VALUES ($entityId, $property, $value)");
		this.s_gpp = this.db.prepare("SELECT x, y, z FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spp = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, x, y, z) VALUES ($entityId, $property, $x, $y, $z)");
		this.s_gps = this.db.prepare("SELECT v_string FROM property WHERE entityid = $entityId AND property = $property");
		this.s_sps = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_string) VALUES ($entityId, $property, $value)");

		this.s_createEntity = this.db.prepare("INSERT INTO entity (type) VALUES ($type)");
		this.s_createNode = this.db.prepare("INSERT INTO node (entityid, parentId) VALUES ($entityId, $parentId)");
		this.s_createConnection = this.db.prepare("INSERT INTO connection (edgeid, nodeid) VALUES ($edgeId, $nodeId)");

		this.s_getNodeParent = this.db.prepare("SELECT parentId FROM node WHERE entityid = $nodeId");
		this.s_getNodeChildren = this.db.prepare("SELECT entityid FROM node WHERE parentID = $nodeId");
		this.s_getNodeEdges = this.db.prepare("SELECT edgeid FROM connection WHERE nodeid = $nodeId");
		this.s_getEdgeNodes = this.db.prepare("SELECT nodeid FROM connection WHERE edgeid = $edgeId");

		this.s_deleteEntity = this.db.prepare("DELETE FROM entity WHERE entityid = $entityId");

		let globalEntityIdRow = this.db.prepare("SELECT entityid FROM entity WHERE type = 'global'").get();

		if(globalEntityIdRow === undefined) {
			this.global = await this.createEntity("global");
		}
		else {
			this.global = this.getEntityRef(globalEntityIdRow.entityid);
		}

		this.baseCreateNode = this.db.transaction((parentId) => {
			const id = this.baseCreateEntity("node");
			this.s_createNode.run({entityId: id, parentId: parentId});
			return id;
		});

		this.baseCreateEdge = this.db.transaction((nodeAId, nodeBId) => {
			const id = this.baseCreateEntity("edge");
			this.s_createConnection.run({edgeID: id, nodeId: nodeAId});
			this.s_createConnection.run({edgeID: id, nodeId: nodeBId});
			return this.getEdgeRef(id);
		});
	}

	baseCreateEntity(type) {
		return this.s_createEntity.run({type: type}).lastInsertRowid;
	}

	async createEntity(type) {
		return this.getEntityRef(this.baseCreateEntity(type));
	}

	async createNode(parentId) {
		return this.getNodeRef(this.baseCreateNode(parentId));
	}

	async createEdge(nodeAId, nodeBId) {
		return this.getEdgeRef(this.baseCreateEdge(nodeAId, nodeBId));
	}

	async getNodeParent(nodeId) {
		const row = this.s_getNodeParent.get({nodeId: nodeId});
		return row.parentid ? this.getNodeRef(row.parentid) : null;
	}

	async * getNodeChildren(nodeId) {
		for(const row of this.s_getNodeChildren.iterate({nodeId: nodeId})) {
			yield this.getNodeRef(row.entityid);
		}
	}

	async * getNodeEdges(nodeId) {
		for(const row of this.s_getNodeEdges.iterate({nodeId: nodeId})) {
			yield this.getDirEdgeRef(row.edgeid, nodeId);
		}
	}

	async * getEdgeNodes(edgeId) {
		for(const row of this.s_getEdgeNodes.iterate({edgeId: edgeId})) {
			yield this.getNodeRef(row.nodeid);
		}
	}

	async removeEntity(entityId) {
		this.s_deleteEntity.run({entityId: entityId});
	}

	async getPNumber(entityId, propertyName) {
		return this.s_gpn.get({
			entityId: entityId,
			property: propertyName,
		}).v_number;
	}

	async setPNumber(entityId, propertyName, value) {
		return this.s_spn.run({
			entityId: entityId,
			property: propertyName,
			value: value,
		});
	}

	async getPPoint(entityId, propertyName) {
		const row = this.s_gpp.get({
			entityId: entityId,
			property: propertyName,
		});
		return new Point(row.x, row.y, row.z);
	}

	async setPPoint(entityId, propertyName, point) {
		return this.s_spp.run({
			entityId: entityId,
			property: propertyName,
			x: point.x,
			y: point.y,
			z: point.z,
		});
	}

	async getPString(entityId, propertyName) {
		return this.s_gps.get({
			entityId: entityId,
			property: propertyName,
		}).v_string;
	}

	async setPString(entityId, propertyName, value) {
		return this.s_sps.run({
			entityId: entityId,
			property: propertyName,
			value: value,
		});
	}
}

export { SQLiteMapBackend };

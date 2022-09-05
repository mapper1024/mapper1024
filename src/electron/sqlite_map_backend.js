import { MapBackend, Vector3, merge } from "../../mapper/index.js";
const Database = require("better-sqlite3");

/** SQLite-backed map backend.
 * Each map is an individual SQLite database file.
 * This backend is built for the Electron desktop app usecase.
 */
class SQLiteMapBackend extends MapBackend {
	/** Ready the backend on a specific database filename.
	 * Note that the file will not be opened or created until #load() is called.
	 * The backend cannot be used until #load() finishes.
	 */
	constructor(filename, options) {
		super();
		this.filename = filename;
		this.options = merge({
			autosave: false,
			cleanup: true,
			create: false,
			readOnly: false,
		}, options);

		this.options.autosave = this.options.autosave && !this.options.readOnly;
	}

	getDbOptions() {
		return {
			fileMustExist: !this.options.create,
		};
	}

	/** Open the backend database, or create it if it does not exist. */
	async load() {
		if(this.options.autosave) {
			this.db = Database(this.filename, this.getDbOptions());
		}
		else {
			const db = Database(this.filename, this.getDbOptions());
			this.db = Database(db.serialize());
			db.close();
		}

		// We use foreign keys and recursive triggers to delete child nodes and edges.
		this.db.pragma("foreign_keys = ON");
		this.db.pragma("recursive_triggers = ON");

		this.db.prepare("CREATE TABLE IF NOT EXISTS entity (entityid INTEGER PRIMARY KEY, type TEXT, valid BOOLEAN)").run();

		// Node table and trigger to delete the corresponding entity when a node is deleted.
		this.db.prepare("CREATE TABLE IF NOT EXISTS node (entityid INT PRIMARY KEY, nodetype TEXT, parentid INT, FOREIGN KEY (entityid) REFERENCES entity(entityid) ON DELETE CASCADE, FOREIGN KEY (parentid) REFERENCES node(entityid) ON DELETE CASCADE)").run();
		this.db.exec("CREATE TRIGGER IF NOT EXISTS r_nodedeleted AFTER DELETE ON node FOR EACH ROW BEGIN DELETE FROM entity WHERE entityid = OLD.entityid; END");

		// Triggers to cascade invalidation
		this.db.exec("CREATE TRIGGER IF NOT EXISTS r_nodeinvalidated_children AFTER UPDATE OF valid ON entity WHEN NEW.type = 'node' AND NEW.valid = false BEGIN UPDATE entity SET valid = FALSE WHERE entityid IN (SELECT entityid FROM node WHERE parentid = NEW.entityid); END");

		// Similar to nodes, a edge's corresponding entity will be deleted via trigger as soon as the edge is deleted.
		this.db.prepare("CREATE TABLE IF NOT EXISTS edge (edgeid INT, nodeid INT, PRIMARY KEY (edgeid, nodeid) FOREIGN KEY (edgeid) REFERENCES entity(entityid) ON DELETE CASCADE, FOREIGN KEY (nodeid) REFERENCES node(entityid) ON DELETE CASCADE)").run();
		this.db.exec("CREATE TRIGGER IF NOT EXISTS r_edgedeleted AFTER DELETE ON edge FOR EACH ROW BEGIN DELETE FROM entity WHERE entityid = OLD.edgeid; END");

		/* Multiple types of property are possible, all combined into one table for now.
		 * Each property can be (with columns):
		 * 	string (v_string TEXT)
		 * 	number (v_number REAL)
		 * 	vector3 (x, y, and z REAL)
		 * The columns corresponding to the other property types are NULL or disregarded.
		 */
		this.db.prepare("CREATE TABLE IF NOT EXISTS property (entityid INT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entityid, property), FOREIGN KEY (entityid) REFERENCES entity(entityid) ON DELETE CASCADE)").run();

		// Property access prepared statements.
		this.s_gpn = this.db.prepare("SELECT v_number FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spn = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_number) VALUES ($entityId, $property, $value)");
		this.s_gpv3 = this.db.prepare("SELECT x, y, z FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spv3 = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, x, y, z) VALUES ($entityId, $property, $x, $y, $z)");
		this.s_gps = this.db.prepare("SELECT v_string FROM property WHERE entityid = $entityId AND property = $property");
		this.s_sps = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_string) VALUES ($entityId, $property, $value)");

		this.s_entityExists = this.db.prepare("SELECT entityid FROM entity WHERE entityid = $entityId");
		this.s_entityValid = this.db.prepare("SELECT entityid FROM entity WHERE entityid = $entityId AND valid = TRUE");

		this.s_createEntity = this.db.prepare("INSERT INTO entity (type, valid) VALUES ($type, TRUE)");
		this.s_createNode = this.db.prepare("INSERT INTO node (entityid, parentId, nodeType) VALUES ($entityId, $parentId, $nodeType)");
		this.s_createConnection = this.db.prepare("INSERT INTO edge (edgeid, nodeid) VALUES ($edgeId, $nodeId)");

		this.s_getNodeParent = this.db.prepare("SELECT nodep.entityid AS parentid FROM node AS nodep INNER JOIN node AS nodec ON nodep.entityid = nodec.parentid INNER JOIN entity ON entity.entityid = nodep.entityid WHERE entity.valid = true AND nodec.entityid = $nodeId");
		this.s_getNodeChildren = this.db.prepare("SELECT node.entityid FROM node INNER JOIN entity ON node.entityid = entity.entityid WHERE parentID = $nodeId AND entity.valid = true");
		this.s_getNodeEdges = this.db.prepare("SELECT edge1.edgeid FROM edge edge1 INNER JOIN edge edge2 ON (edge1.edgeid = edge2.edgeid AND edge1.nodeid != edge2.nodeid) INNER JOIN entity entity1 ON entity1.entityid = edge1.edgeid INNER JOIN entity entity2 ON entity2.entityid = edge2.nodeid WHERE edge1.nodeid = $nodeId AND entity1.valid = true AND entity2.valid = true");
		this.s_getEdgeNodes = this.db.prepare("SELECT nodeid FROM edge INNER JOIN entity ON nodeid = entity.entityid WHERE edgeid = $edgeId AND entity.valid = true");

		this.s_getEdgeBetween = this.db.prepare("SELECT edge1.edgeid AS edgeid FROM edge edge1 INNER JOIN edge edge2 ON (edge1.edgeid = edge2.edgeid AND edge1.nodeid != edge2.nodeid) WHERE edge1.nodeid = $nodeAId AND edge2.nodeid = $nodeBId");

		this.s_getNodesTouchingArea = this.db.prepare("SELECT node.entityid FROM node INNER JOIN property ON node.entityid = property.entityid INNER JOIN entity ON node.entityid = entity.entityid INNER JOIN property AS radiusproperty ON node.entityid = radiusproperty.entityid WHERE entity.valid = TRUE AND property.property = 'center' AND radiusproperty.property = 'radius' AND property.x >= $ax - radiusproperty.v_number AND property.x <= $bx + radiusproperty.v_number AND property.y >= $ay - radiusproperty.v_number AND property.y <= $by + radiusproperty.v_number AND property.z >= $az - radiusproperty.v_number AND property.z <= $bz + radiusproperty.v_number");

		// Triggers & foreign key constraints will handle deleting everything else relating to the entity.
		this.s_deleteEntity = this.db.prepare("DELETE FROM entity WHERE entityid = $entityId");
		this.s_invalidateEntity = this.db.prepare("UPDATE entity SET valid = FALSE WHERE entityid = $entityId AND valid = TRUE");
		this.s_validateEntity = this.db.prepare("UPDATE entity SET valid = TRUE WHERE entityid = $entityId");

		/* Find or create the global entity.
		 * There can be only one.
		 */
		this.db.transaction(() => {
			let globalEntityIdRow = this.db.prepare("SELECT entityid FROM entity WHERE type = 'global'").get();
			if(globalEntityIdRow === undefined) {
				this.global = this.getEntityRef(this.baseCreateEntity("global"));
			}
			else {
				this.global = this.getEntityRef(globalEntityIdRow.entityid);
			}
		}).exclusive();

		/** Create a node atomically.
		 * @param parentId {number|null} The ID of the node's parent, or null if none.
		 * @param nodeType {string} The type of node. "object" or "point"
		 * @returns {number} The ID of the new node.
		 */
		this.baseCreateNode = this.db.transaction((parentId, nodeType) => {
			const id = this.baseCreateEntity("node");
			this.s_createNode.run({entityId: id, parentId: parentId, nodeType: nodeType});
			return id;
		});

		/** Create an edge atomically.
		 * @param nodeAId {number} The ID of one of the nodes on the edge.
		 * @param nodeBId {number} The ID of the other node on the edge.
		 * @returns {number} The ID of the new edge.
		 */
		this.baseCreateEdge = this.db.transaction((nodeAId, nodeBId) => {
			const id = this.baseCreateEntity("edge");
			this.s_createConnection.run({edgeId: id, nodeId: nodeAId});
			this.s_createConnection.run({edgeId: id, nodeId: nodeBId});
			return id;
		});

		if(this.options.cleanup && !this.options.readOnly) {
			this.db.exec("DELETE FROM entity WHERE valid = FALSE");
			this.db.exec("VACUUM");
		}

		this.loaded = true;
		await this.hooks.call("loaded");
	}

	async flush() {
		if(!this.options.autosave && !this.options.readOnly) {
			await this.save(this.filename, false);
		}
	}

	async save(filename, swapDb) {
		await this.db.backup(filename);

		if(swapDb) {
			// Replace the current database with the newly written database.
			this.filename = filename;
			const newBackend = new SQLiteMapBackend(filename, merge(this.options, {
				cleanup: false,
				readOnly: false,
			}));
			await newBackend.load();
			this.db = newBackend.db;
			this.options.readOnly = false;
		}
		else {
			// We don't need the saved database to be identical, so let's clean it up.
			const saved = new SQLiteMapBackend(filename, {cleanup: true, autosave: true});
			await saved.load();
			await saved.flush();
		}
	}

	baseCreateEntity(type) {
		return this.s_createEntity.run({type: type}).lastInsertRowid;
	}

	async entityExists(entityId) {
		return this.s_entityExists.get({entityId: entityId}) !== undefined;
	}

	async entityValid(entityId) {
		return this.s_entityValid.get({entityId: entityId}) !== undefined;
	}

	async createEntity(type) {
		return this.getEntityRef(this.baseCreateEntity(type));
	}

	async createNode(parentId, nodeType) {
		const nodeRef = this.getNodeRef(this.baseCreateNode(parentId, nodeType));
		await nodeRef.create();
		return nodeRef;
	}

	async createEdge(nodeAId, nodeBId) {
		return this.getEdgeRef(this.baseCreateEdge(nodeAId, nodeBId));
	}

	async getNodeParent(nodeId) {
		const row = this.s_getNodeParent.get({nodeId: nodeId});
		return (row && row.parentid) ? this.getNodeRef(row.parentid) : null;
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
		this.s_invalidateEntity.run({entityId: entityId});
	}

	async unremoveEntity(entityId) {
		this.s_validateEntity.run({entityId: entityId});
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

	async getPVector3(entityId, propertyName) {
		const row = this.s_gpv3.get({
			entityId: entityId,
			property: propertyName,
		});
		return new Vector3(row.x, row.y, row.z);
	}

	async setPVector3(entityId, propertyName, vector3) {
		return this.s_spv3.run({
			entityId: entityId,
			property: propertyName,
			x: vector3.x,
			y: vector3.y,
			z: vector3.z,
		});
	}

	async getPString(entityId, propertyName) {
		const row = this.s_gps.get({
			entityId: entityId,
			property: propertyName,
		});
		return row ? row.v_string : undefined;
	}

	async setPString(entityId, propertyName, value) {
		return this.s_sps.run({
			entityId: entityId,
			property: propertyName,
			value: value,
		});
	}

	async getEdgeBetween(nodeAId, nodeBId) {
		const row = this.s_getEdgeBetween.get({nodeAId: nodeAId, nodeBId: nodeBId});
		return (row === undefined) ? null : this.getEdgeRef(row.edgeid);
	}

	async * getNodesTouchingArea(box) {
		for(const row of this.s_getNodesTouchingArea.iterate({ax: box.a.x, ay: box.a.y, az: box.a.z, bx: box.b.x, by: box.b.y, bz: box.b.z})) {
			yield this.getNodeRef(row.entityid);
		}
	}
}

export { SQLiteMapBackend };

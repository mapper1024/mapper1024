import { MapBackend, Vector3 } from "../index.js";

// Load [sql.js](https://sql.js.org) from the remote server.
let sqlJsPromise;
async function SqlJs() {
	if(sqlJsPromise === undefined) {
		sqlJsPromise = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://sql.js.org/dist/sql-wasm.js";
			script.addEventListener("load", async function() {
				const SQL = await window.initSqlJs({
					locateFile: file => `https://sql.js.org/dist/${file}`,
				});

				resolve(SQL);
			});
			script.addEventListener("error", reject);
			document.head.appendChild(script);
		});
	}
	return await sqlJsPromise;
}

class SqlJsMapBackend extends MapBackend {
	async load() {
		this.db = new (await SqlJs()).Database();

		this.db.run("PRAGMA foreign_keys = ON");
		this.db.run("PRAGMA recursive_triggers = ON");

		this.db.run("CREATE TABLE IF NOT EXISTS entity (entityid INTEGER PRIMARY KEY, type TEXT, valid BOOLEAN)");

		// Node table and trigger to delete the corresponding entity when a node is deleted.
		this.db.run("CREATE TABLE IF NOT EXISTS node (entityid INT PRIMARY KEY, parentid INT, FOREIGN KEY (entityid) REFERENCES entity(entityid) ON DELETE CASCADE, FOREIGN KEY (parentid) REFERENCES node(entityid) ON DELETE CASCADE)");
		this.db.run("CREATE TRIGGER IF NOT EXISTS r_nodedeleted AFTER DELETE ON node FOR EACH ROW BEGIN DELETE FROM entity WHERE entityid = OLD.entityid; END");

		// Triggers to cascade invalidation
		this.db.run("CREATE TRIGGER IF NOT EXISTS r_nodeinvalidated_children AFTER UPDATE OF valid ON entity WHEN NEW.type = 'node' AND NEW.valid = false BEGIN UPDATE entity SET valid = FALSE WHERE entityid IN (SELECT entityid FROM node WHERE parentid = NEW.entityid); END");
		this.db.run("CREATE TRIGGER IF NOT EXISTS r_nodeinvalidated_edges AFTER UPDATE OF valid ON entity WHEN NEW.type = 'node' AND NEW.valid = false BEGIN UPDATE entity SET valid = FALSE WHERE entityid IN (SELECT edgeid FROM edge WHERE nodeid = NEW.entityid); END");

		// Similar to nodes, a edge's corresponding entity will be deleted via trigger as soon as the edge is deleted.
		this.db.run("CREATE TABLE IF NOT EXISTS edge (edgeid INT, nodeid INT, PRIMARY KEY (edgeid, nodeid) FOREIGN KEY (edgeid) REFERENCES entity(entityid) ON DELETE CASCADE, FOREIGN KEY (nodeid) REFERENCES node(entityid) ON DELETE CASCADE)");
		this.db.run("CREATE TRIGGER IF NOT EXISTS r_edgedeleted AFTER DELETE ON edge FOR EACH ROW BEGIN DELETE FROM entity WHERE entityid = OLD.edgeid; END");

		/* Multiple types of property are possible, all combined into one table for now.
		 * Each property can be (with columns):
		 * 	string (v_string TEXT)
		 * 	number (v_number REAL)
		 * 	vector3 (x, y, and z REAL)
		 * The columns corresponding to the other property types are NULL or disregarded.
		 */
		this.db.run("CREATE TABLE IF NOT EXISTS property (entityid INT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entityid, property), FOREIGN KEY (entityid) REFERENCES entity(entityid) ON DELETE CASCADE)");

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
		this.s_createNode = this.db.prepare("INSERT INTO node (entityid, parentid) VALUES ($entityId, $parentId)");
		this.s_createConnection = this.db.prepare("INSERT INTO edge (edgeid, nodeid) VALUES ($edgeId, $nodeId)");

		this.s_getNodeParent = this.db.prepare("SELECT nodep.entityid AS parentid FROM node AS nodep INNER JOIN node AS nodec ON nodep.entityid = nodec.parentid INNER JOIN entity ON entity.entityid = nodep.entityid WHERE entity.valid = true AND nodec.entityid = $nodeId");
		this.s_getNodeChildren = this.db.prepare("SELECT node.entityid FROM node INNER JOIN entity ON node.entityid = entity.entityid WHERE parentID = $nodeId AND entity.valid = true");
		this.s_getNodeEdges = this.db.prepare("SELECT edgeid FROM edge INNER JOIN entity ON entity.entityid = edge.edgeid WHERE nodeid = $nodeId AND entity.valid = true");
		this.s_getEdgeNodes = this.db.prepare("SELECT nodeid FROM edge INNER JOIN entity ON nodeid = entity.entityid WHERE edgeid = $edgeId AND entity.valid = true");

		this.s_getEdgeBetween = this.db.prepare("SELECT edge1.edgeid AS edgeid FROM edge edge1 INNER JOIN edge edge2 ON (edge1.edgeid = edge2.edgeid AND edge1.nodeid != edge2.nodeid) WHERE edge1.nodeid = $nodeAId AND edge2.nodeid = $nodeBId");

		this.s_getNodesInArea = this.db.prepare("SELECT node.entityid FROM node INNER JOIN property ON node.entityid = property.entityid INNER JOIN entity ON node.entityid = entity.entityid WHERE entity.valid = TRUE AND property.property = 'center' AND property.x >= $ax AND property.x <= $bx AND property.y >= $ay AND property.y <= $by AND property.z >= $az AND property.z <= $bz");

		this.s_getNodesTouchingArea = this.db.prepare("SELECT node.entityid FROM node INNER JOIN property ON node.entityid = property.entityid INNER JOIN entity ON node.entityid = entity.entityid INNER JOIN property AS radiusproperty ON node.entityid = radiusproperty.entityid WHERE entity.valid = TRUE AND property.property = 'center' AND radiusproperty.property = 'radius' AND property.x >= $ax - radiusproperty.v_number AND property.x <= $bx + radiusproperty.v_number AND property.y >= $ay - radiusproperty.v_number AND property.y <= $by + radiusproperty.v_number AND property.z >= $az - radiusproperty.v_number AND property.z <= $bz + radiusproperty.v_number");

		// Triggers & foreign key constraints will handle deleting everything else relating to the entity.
		this.s_deleteEntity = this.db.prepare("DELETE FROM entity WHERE entityid = $entityId");
		this.s_invalidateEntity = this.db.prepare("UPDATE entity SET valid = FALSE WHERE entityid = $entityId AND valid = TRUE");
		this.s_validateEntity = this.db.prepare("UPDATE entity SET valid = TRUE WHERE entityid = $entityId");

		/* Find or create the global entity.
		 * There can be only one.
		 */
		this.db.run("BEGIN EXCLUSIVE TRANSACTION");
		let globalEntityIdRow = this.db.prepare("SELECT entityid FROM entity WHERE type = 'global'").get();
		if(globalEntityIdRow.length === 0) {
			this.global = this.getEntityRef(this.baseCreateEntity("global"));
		}
		else {
			this.global = this.getEntityRef(globalEntityIdRow[0]);
		}
		this.db.run("COMMIT");

		/** Create a node atomically.
		 * @param parentId {number|null} The ID of the node's parent, or null if none.
		 * @returns {number} The ID of the new node.
		 */
		this.baseCreateNode = (parentId) => {
			this.db.run("BEGIN EXCLUSIVE TRANSACTION");
			const id = this.baseCreateEntity("node");
			this.s_createNode.run({$entityId: id, $parentId: parentId});
			this.db.run("COMMIT");
			return id;
		};

		/** Create an edge atomically.
		 * @param nodeAId {number} The ID of one of the nodes on the edge.
		 * @param nodeBId {number} The ID of the other node on the edge.
		 * @returns {number} The ID of the new edge.
		 */
		this.baseCreateEdge = (nodeAId, nodeBId) => {
			this.db.run("BEGIN EXCLUSIVE TRANSACTION");
			const id = this.baseCreateEntity("edge");
			this.s_createConnection.run({$edgeId: id, nodeId: nodeAId});
			this.s_createConnection.run({$edgeId: id, $nodeId: nodeBId});
			this.db.run("COMMIT");
			return id;
		};

		this.loaded = true;
		await this.hooks.call("loaded");
	}

	baseCreateEntity(type) {
		this.s_createEntity.run({type: type});
		return this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
	}

	async entityExists(entityId) {
		return this.s_entityExists.get({$entityId: entityId}) !== undefined;
	}

	async entityValid(entityId) {
		return this.s_entityValid.get({$entityId: entityId}) !== undefined;
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
		const row = this.s_getNodeParent.get({$nodeId: nodeId});
		return (row.length > 0 && row[0]) ? this.getNodeRef(row[0]) : null;
	}

	async * getNodeChildren(nodeId) {
		this.s_getNodeChildren.bind({$nodeId: nodeId});
		while(this.s_getNodeChildren.step()) {
			yield this.getNodeRef(this.s_getNodeChildren.get()[0]);
		}
	}

	async removeEntity(entityId) {
		this.s_invalidateEntity.run({$entityId: entityId});
	}

	async unremoveEntity(entityId) {
		this.s_validateEntity.run({$entityId: entityId});
	}

	async getPNumber(entityId, propertyName) {
		return this.s_gpn.get({
			$entityId: entityId,
			$property: propertyName,
		})[0];
	}

	async setPNumber(entityId, propertyName, value) {
		return this.s_spn.run({
			$entityId: entityId,
			$property: propertyName,
			$value: value,
		});
	}

	async getPVector3(entityId, propertyName) {
		const row = this.s_gpv3.get({
			$entityId: entityId,
			$property: propertyName,
		});
		return new Vector3(row[0], row[1], row[2]);
	}

	async setPVector3(entityId, propertyName, vector3) {
		return this.s_spv3.run({
			$entityId: entityId,
			$property: propertyName,
			$x: vector3.x,
			$y: vector3.y,
			$z: vector3.z,
		});
	}

	async getPString(entityId, propertyName) {
		const row = this.s_gps.get({
			$entityId: entityId,
			$property: propertyName,
		});
		return row.length === 0 ? undefined : row[0];
	}

	async setPString(entityId, propertyName, value) {
		return this.s_sps.run({
			$entityId: entityId,
			$property: propertyName,
			$value: value,
		});
	}

	async * getNodesInArea(box) {
		this.s_getNodesInArea.bind({$ax: box.a.x, $ay: box.a.y, $az: box.a.z, $bx: box.b.x, $by: box.b.y, $bz: box.b.z});
		while(this.s_getNodesInArea.step()) {
			yield this.getNodeRef(this.s_getNodesInArea.get()[0]);
		}
	}

	async * getNodesTouchingArea(box) {
		this.s_getNodesTouchingArea.bind({$ax: box.a.x, $ay: box.a.y, $az: box.a.z, $bx: box.b.x, $by: box.b.y, $bz: box.b.z});
		while(this.s_getNodesTouchingArea.step()) {
			yield this.getNodeRef(this.s_getNodesTouchingArea.get()[0]);
		}
	}
}

export { SqlJsMapBackend };

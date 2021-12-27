import { MapBackend, Point } from "../../mapper/index.js";

const Database = require("better-sqlite3");

class SQLiteMapBackend extends MapBackend {
	constructor(filename) {
		super();
		this.filename = filename;
	}

	async load() {
		this.db = Database(this.filename);

		this.db.prepare("CREATE TABLE IF NOT EXISTS entity (entityid INTEGER PRIMARY KEY, type TEXT)").run();
		this.db.prepare("CREATE TABLE IF NOT EXISTS node (nodeid INT PRIMARY KEY, parentid INT, FOREIGN KEY (nodeid) REFERENCES entity(entityid), FOREIGN KEY (parentid) REFERENCES entity(entityid))").run();

		/* Each property can be either a
		 * string
		 * number (real float)
		 * point (x, y, and z real float)
		 */
		this.db.prepare("CREATE TABLE IF NOT EXISTS property (entityid INT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entityid, property), FOREIGN KEY (entityid) REFERENCES entity(entityid))").run();
		this.db.prepare("CREATE TABLE IF NOT EXISTS neighbor (nodeaid INT, nodebid INT, PRIMARY KEY (nodeaid, nodebid), FOREIGN KEY (nodeaid) REFERENCES node(nodeid) FOREIGN KEY (nodebid) REFERENCES node(nodeid))").run();

		this.s_gpn = this.db.prepare("SELECT v_number FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spn = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_number) VALUES ($entityId, $property, $value)");
		this.s_gpp = this.db.prepare("SELECT x, y, z FROM property WHERE entityid = $entityId AND property = $property");
		this.s_spp = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, x, y, z) VALUES ($entityId, $property, $x, $y, $z)");
		this.s_gps = this.db.prepare("SELECT v_string FROM property WHERE entityid = $entityId AND property = $property");
		this.s_sps = this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_string) VALUES ($entityId, $property, $value)");
		this.s_createEntity = this.db.prepare("INSERT INTO entity (type) VALUES ($type)");

		let globalEntityIdRow = this.db.prepare("SELECT entityid FROM entity WHERE type = 'global'").get();

		if(globalEntityIdRow === undefined) {
			this.global = await this.createEntity("global");
		}
		else {
			this.global = this.getEntityRef(globalEntityIdRow.entityid);
		}
	}

	async createEntity(type) {
		return this.getEntityRef(this.s_createEntity.run({type: type}).lastInsertRowid);
	}

	async getPNumber(entityId, propertyName) {
		return (await this.s_gpn.get({
			entityId: entityId,
			property: propertyName,
		})).v_number;
	}

	async setPNumber(entityId, propertyName, value) {
		return this.s_spn.run({
			entityId: entityId,
			property: propertyName,
			value: value,
		});
	}

	async getPPoint(entityId, propertyName) {
		const row = await this.s_gpp.get({
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
		return (await this.s_gps.get({
			entityId: entityId,
			$property: propertyName,
		})).v_string;
	}

	async setPString(entityId, propertyName, value) {
		return this.s_sps.run({
			entityId: entityId,
			$property: propertyName,
			$value: value,
		});
	}
}

export { SQLiteMapBackend };

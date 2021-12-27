import { MapBackend, Point } from "../../mapper/index.js";

const sqlite3 = require("sqlite3").verbose();
const sqlite = require("sqlite");

class SQLiteMapBackend extends MapBackend {
	constructor(filename) {
		super();
		this.filename = filename;
	}

	async load() {
		this.db = await sqlite.open({
			filename: this.filename,
			driver: sqlite3.Database,
		});

		await this.db.run("CREATE TABLE IF NOT EXISTS entity (entityid INTEGER PRIMARY KEY, type TEXT)");
		await this.db.run("CREATE TABLE IF NOT EXISTS node (nodeid INT PRIMARY KEY, parentid INT, FOREIGN KEY (nodeid) REFERENCES entity(entityid), FOREIGN KEY (parentid) REFERENCES entity(entityid))");

		await Promise.all([
			/* Each property can be either a
			 * string
			 * number (real float)
			 * point (x, y, and z real float)
			 */
			this.db.run("CREATE TABLE IF NOT EXISTS property (entityid INT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entityid, property), FOREIGN KEY (entityid) REFERENCES entity(entityid))"),
			this.db.run("CREATE TABLE IF NOT EXISTS neighbor (nodeaid INT, nodebid INT, PRIMARY KEY (nodeaid, nodebid), FOREIGN KEY (nodeaid) REFERENCES node(nodeid) FOREIGN KEY (nodebid) REFERENCES node(nodeid))"),
		]);

		[
			this.s_gpn,
			this.s_spn,
			this.s_gpp,
			this.s_spp,
			this.s_gps,
			this.s_sps,
			this.s_createEntity,
		] = await Promise.all([
			this.db.prepare("SELECT v_number FROM property WHERE entityid = $entityId AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_number) VALUES ($entityId, $property, $value)"),
			this.db.prepare("SELECT x, y, z FROM property WHERE entityid = $entityId AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, x, y, z) VALUES ($entityId, $property, $x, $y, $z)"),
			this.db.prepare("SELECT v_string FROM property WHERE entityid = $entityId AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO property (entityid, property, v_string) VALUES ($entityId, $property, $value)"),
			this.db.prepare("INSERT INTO entity (type) VALUES ($type)"),
		]);

		let globalEntityId = await this.db.get("SELECT entityid FROM entity WHERE type = 'global'");

		if(globalEntityId === undefined) {
			this.global = await this.createEntity("global");
		}
		else {
			this.global = this.getEntityRef(globalEntityId);
		}
	}

	async createEntity(type) {
		return this.getEntityRef((await this.s_createEntity.run({$type: type})).lastID);
	}

	async getPNumber(entityId, propertyName) {
		return (await this.s_gpn.get({
			$entityId: entityId,
			$property: propertyName,
		})).v_number;
	}

	async setPNumber(entityId, propertyName, value) {
		return this.s_spn.run({
			$entityId: entityId,
			$property: propertyName,
			$value: value,
		});
	}

	async getPPoint(entityId, propertyName) {
		const row = await this.s_gpp.get({
			$entityId: entityId,
			$property: propertyName,
		});
		return new Point(row.x, row.y, row.z);
	}

	async setPPoint(entityId, propertyName, point) {
		return this.s_spp.run({
			$entityId: entityId,
			$property: propertyName,
			$x: point.x,
			$y: point.y,
			$z: point.z,
		});
	}

	async getPString(entityId, propertyName) {
		return (await this.s_gps.get({
			$entityId: entityId,
			$property: propertyName,
		})).v_string;
	}

	async setPString(entityId, propertyName, value) {
		return this.s_sps.run({
			$entityId: entityId,
			$property: propertyName,
			$value: value,
		});
	}
}

export { SQLiteMapBackend };

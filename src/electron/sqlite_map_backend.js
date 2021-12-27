import { MapBackend, Point } from "../../mapper/index.js";
const sqlite3 = require("sqlite3").verbose();
const sqlite = require("sqlite");

class SQLiteMapBackend {
	constructor(filename) {
		this.filename = filename;
	}

	async load() {
		this.db = await sqlite.open({
			filename: this.filename,
			driver: sqlite3.Database,
		});

		await Promise.all([
			this.db.run("CREATE TABLE IF NOT EXISTS properties (entity TEXT, property TEXT, v_string TEXT, v_number REAL, x REAL, y REAL, z REAL, PRIMARY KEY (entity, property))"),
			this.db.run("CREATE TABLE IF NOT EXISTS nodes (node TEXT PRIMARY KEY, parent TEXT)"),
			this.db.run("CREATE TABLE IF NOT EXISTS neighbors (nodeA TEXT, nodeB TEXT, PRIMARY KEY (nodeA, nodeB))"),
		]);

		[this.s_gpn, this.s_spn, this.s_gpp, this.s_spp, this.s_gps, this.s_sps] = await Promise.all([
			this.db.prepare("SELECT v_number FROM properties WHERE entity = $entity AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO properties (entity, property, v_number) VALUES ($entity, $property, $value)"),
			this.db.prepare("SELECT x, y, z FROM properties WHERE entity = $entity AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO properties (entity, property, x, y, z) VALUES ($entity, $property, $x, $y, $z)"),
			this.db.prepare("SELECT v_string FROM properties WHERE entity = $entity AND property = $property"),
			this.db.prepare("INSERT OR REPLACE INTO properties (entity, property, v_string) VALUES ($entity, $property, $value)"),
		]);
	}

	async getPNumber(entity, propertyName) {
		return (await this.s_gpn.get({
			$entity: entity,
			$property: propertyName,
		})).value;
	}

	async setPNumber(entity, propertyName, value) {
		return this.s_spn.run({
			$entity: entity,
			$property: propertyName,
			$value: value,
		});
	}

	async getPPoint(entity, propertyName) {
		const row = await this.s_gpp.get({
			$entity: entity,
			$property: propertyName,
		});
		return new Point(row.x, row.y, row.z);
	}

	async setPPoint(entity, propertyName, point) {
		return this.s_spp.run({
			$entity: entity,
			$property: propertyName,
			$x: point.x,
			$y: point.y,
			$z: point.z,
		});
	}

	async getPString(entity, propertyName) {
		return (await this.s_gps.get({
			$entity: entity,
			$property: propertyName,
		})).value;
	}

	async setPString(entity, propertyName, value) {
		return this.s_sps.run({
			$entity: entity,
			$property: propertyName,
			$value: value,
		});
	}
}

export { SQLiteMapBackend };

import { MapBackend } from "../../mapper/index.js"
const sqlite3 = require("sqlite3").verbose()
const sqlite = require("sqlite")

class SQLiteMapBackend {
	constructor(filename) {
		this.filename = filename
	}

	async load() {
		this.db = await sqlite.open({
			filename: this.filename,
			driver: sqlite3.Database,
		})

		await Promise.all([
			this.db.run("CREATE TABLE IF NOT EXISTS properties (entity TEXT, property TEXT, value TEXT, PRIMARY KEY (entity, property))"),
			this.db.run("CREATE TABLE IF NOT EXISTS nodes (node TEXT PRIMARY KEY, parent TEXT)"),
			this.db.run("CREATE TABLE IF NOT EXISTS neighbors (nodeA TEXT, nodeB TEXT, PRIMARY KEY (nodeA, nodeB))"),
		])
	}

	async getPString(entity, propertyName) {
		return (await this.db.get("SELECT value FROM properties WHERE entity = $entity AND property = $property", {
			$entity: entity,
			$property: propertyName,
		})).value
	}

	async setPString(entity, propertyName, value) {
		return this.db.run("INSERT OR REPLACE INTO properties (entity, property, value) VALUES ($entity, $property, $value)", {
			$entity: entity,
			$property: propertyName,
			$value: value,
		})
	}
}

export { SQLiteMapBackend }

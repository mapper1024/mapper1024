import { MapBackend } from "../../mapper/index.js"
const sqlite3 = require("sqlite3").verbose()

class SQLiteMapBackend {
	constructor(filename) {
		this.db = new sqlite3.Database(filename)
	}
}

export { SQLiteMapBackend }

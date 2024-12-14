const expect = require("chai").expect;
const tmp = require("tmp");
const _require = require("esm")(module);
const fs = require("fs/promises");
const { SQLiteMapBackend } = _require("../src/electron/sqlite_map_backend.js");
const { SqlJsMapBackend } = _require("../mapper/index.js");
const initSqlJs = require("sql.js");

describe("SQLite backend intercompatibility", function() {
	this.timeout(10000);

	beforeEach(async function() {
		this.backendFilename = tmp.tmpNameSync();
		(await fs.open(this.backendFilename, "wx")).close();
	});

	it("should be interchangable sql.js -> sqlite", async function() {
		this.backend = new SqlJsMapBackend({sqlJsFactory: initSqlJs});
		await this.backend.load();

		await this.backend.global.setPString("some property", "some value");
		const root = await this.backend.createNode(null, "test");

		const childA = await this.backend.createNode(root.id, "test");
		const childB = await this.backend.createNode(root.id, "test");

		const childEdgeAB = await this.backend.createEdge(childA.id, childB.id);

		const backendFile = await fs.open(this.backendFilename, "w");
		await backendFile.write(await this.backend.getData());
		await backendFile.close();

		this.backend2 = new SQLiteMapBackend(this.backendFilename);
		await this.backend2.load();

		expect(this.backend.global.id).to.equal(this.backend2.global.id);
		expect(await this.backend2.global.getPString("some property")).to.equal("some value");
		expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
		expect((await this.backend2.getEdgeBetween(childA.id, childB.id)).id).to.equal(childEdgeAB.id);
	});

	it("should be interchangable sqlite -> sql.js", async function() {
		this.backend = new SQLiteMapBackend(this.backendFilename);
		await this.backend.load();

		await this.backend.global.setPString("some property", "some value");
		const root = await this.backend.createNode(null, "test");

		const childA = await this.backend.createNode(root.id, "test");
		const childB = await this.backend.createNode(root.id, "test");

		const childEdgeAB = await this.backend.createEdge(childA.id, childB.id);

		await this.backend.flush();

		const backendFile = await fs.open(this.backendFilename, "r");
		this.backend2 = new SqlJsMapBackend({
			loadFrom: "data",
			data: await backendFile.readFile(),
			sqlJsFactory: initSqlJs,
		});
		await backendFile.close();

		await this.backend2.load();

		expect(this.backend.global.id).to.equal(this.backend2.global.id);
		expect(await this.backend2.global.getPString("some property")).to.equal("some value");
		expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
		expect((await this.backend2.getEdgeBetween(childA.id, childB.id)).id).to.equal(childEdgeAB.id);
	});

	afterEach(async function() {
		await fs.unlink(this.backendFilename);
	});
});

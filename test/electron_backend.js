const expect = require("chai").expect;
const tmp = require("tmp");
const _require = require("esm")(module);
const fs = require("fs/promises");
const { testGenericBackend } = _require("./generic_backend.js");
const { SQLiteMapBackend } = _require("../src/electron/sqlite_map_backend.js");

describe("SQLiteMapBackend", function() {
	before(async function() {
		this.backendFilename = tmp.tmpNameSync();

		// Create initially as empty file for the first unlink.
		(await fs.open(this.backendFilename, "wx")).close();
	});

	beforeEach(async function() {
		await fs.unlink(this.backendFilename);
		this.backend = new SQLiteMapBackend(this.backendFilename, {create: true});
		await this.backend.load();
	});

	testGenericBackend();

	it("should persist over multiple opens", async function() {
		this.backend.global.setPString("some property", "some value");
		await this.backend.flush();

		this.backend2 = new SQLiteMapBackend(this.backendFilename);
		await this.backend2.load();

		expect(this.backend.global.id).to.equal(this.backend2.global.id);
		expect(await this.backend2.global.getPString("some property")).to.equal("some value");
	});

	after(async function() {
		await fs.unlink(this.backendFilename);
	});
});

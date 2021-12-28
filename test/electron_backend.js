const expect = require("chai").expect;
const tmp = require("tmp");
const _require = require("esm")(module);
const fs = require("fs/promises");
const { SQLiteMapBackend } = _require("../src/electron/sqlite_map_backend.js");
const { Point, asyncFrom } = _require("../mapper/index.js");

describe("SQLiteMapBackend", function() {
	let backend;
	let backendFilename;

	before(async function() {
		backendFilename = tmp.tmpNameSync();

		// Create initially as empty file for the first unlink.
		(await fs.open(backendFilename, "wx")).close();
	});

	beforeEach(async function() {
		await fs.unlink(backendFilename);
		backend = new SQLiteMapBackend(backendFilename);
		await backend.load();
	});

	describe("properties", function() {
		const string = "the test string";
		const number = 0xCAFF00D;
		const point = new Point(12.34, 56.78, 90.12);

		beforeEach(async function() {
			await backend.global.setPString("string property", string);
			await backend.global.setPNumber("number property", number);
			await backend.global.setPPoint("point property", point);
		});

		it("should hold set values", async function() {
			expect(await backend.global.getPString("string property")).to.equal(string);
			expect(await backend.global.getPNumber("number property")).to.equal(number);
			expect(await backend.global.getPPoint("point property")).to.deep.equal(point);
		});
	});

	describe("graph", function() {
		let root;
		let childA;
		let childB;
		let grandchildA;
		let grandchildB;
		let childEdge;
		let grandchildEdge;

		const grandchildString = "a grandchild's string";

		beforeEach(async function() {
			root = await backend.createNode();

			childA = await backend.createNode(root.id);
			childB = await backend.createNode(root.id);

			grandchildA = await backend.createNode(childB.id);
			grandchildB = await backend.createNode(childB.id);

			await grandchildA.setPString("another string property", grandchildString);

			childEdge = await backend.createEdge(childA.id, childB.id);
			grandchildEdge = await backend.createEdge(grandchildB.id, grandchildA.id);
		});

		describe("graph", function() {
			it("should have node trees", async function() {
				expect(await root.getParent()).to.equal(null);

				expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
				expect((await childB.getParent()).id, "childB parent").to.equal(root.id);

				expect((await grandchildA.getParent()).id, "grandchildA parent").to.equal(childB.id);
				expect((await grandchildB.getParent()).id, "grandchildB parent").to.equal(childB.id);

				expect(await asyncFrom(root.getChildren(), (child) => child.id)).has.members([childA.id, childB.id]);
			});

			it("should have edges", async function() {

			});

			it("should have removable nodes", async function() {
			});

			it("should have removable edges", async function() {

			});
		});

		it("should persist over multiple opens", async function() {
			await backend.flush();

			let backend2 = new SQLiteMapBackend(backendFilename);
			await backend2.load();

			expect(await grandchildA.getPString("another string property")).to.equal(grandchildString);

			const grandchildA_again = await backend2.getNodeRef(grandchildA.id);
			expect(await grandchildA_again.getPString("another string property")).to.equal(grandchildString);
		});
	});

	after(async function() {
		await fs.unlink(backendFilename);
	});
});

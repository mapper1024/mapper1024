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
		let childC;
		let grandchildA;
		let grandchildB;
		let grandchildC;
		let childEdgeAB;
		let childEdgeAC;
		let grandchildEdge;

		const grandchildString = "a grandchild's string";

		beforeEach(async function() {
			root = await backend.createNode();

			childA = await backend.createNode(root.id);
			childB = await backend.createNode(root.id);
			childC = await backend.createNode(root.id);

			grandchildA = await backend.createNode(childB.id);
			grandchildB = await backend.createNode(childB.id);
			grandchildC = await backend.createNode(childC.id);

			await grandchildA.setPString("another string property", grandchildString);

			childEdgeAB = await backend.createEdge(childA.id, childB.id);
			childEdgeAC = await backend.createEdge(childA.id, childC.id);
			grandchildEdge = await backend.createEdge(grandchildB.id, grandchildA.id);
		});

		it("should have node trees", async function() {
			expect(await root.getParent()).to.equal(null);

			expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
			expect((await childB.getParent()).id, "childB parent").to.equal(root.id);

			expect((await grandchildA.getParent()).id, "grandchildA parent").to.equal(childB.id);
			expect((await grandchildB.getParent()).id, "grandchildB parent").to.equal(childB.id);

			expect(await asyncFrom(root.getChildren(), (child) => child.id)).has.members([childA.id, childB.id, childC.id]);
		});

		it("should have edges", async function() {
			expect(await asyncFrom(childA.getEdges(), (edge) => edge.id)).has.members([childEdgeAB.id, childEdgeAC.id]);
			expect(await asyncFrom(childA.getEdges(), async (edge) => (await edge.getOtherNode(childA.id)).id)).has.members([childB.id, childC.id]);
			expect(await asyncFrom(childA.getEdges(), async (edge) => (await edge.getDirOtherNode()).id)).has.members([childB.id, childC.id]);

			expect(await asyncFrom(childEdgeAC.getNodes(), (node) => node.id)).has.members([childA.id, childC.id]);
		});

		it("should have removable nodes", async function() {
			await childB.remove();

			expect(await root.exists(), "root").to.equal(true);
			expect(await childA.exists(), "childA").to.equal(true);
			expect(await childC.exists(), "childC").to.equal(true);
			expect(await grandchildC.exists(), "grandchildC").to.equal(true);

			expect(await childEdgeAC.exists(), "childEdgeAC").to.equal(true);

			expect(await childB.exists(), "childB").to.equal(false);
			expect(await grandchildA.exists(), "grandchildA").to.equal(false);
			expect(await grandchildB.exists(), "grandchildB").to.equal(false);

			expect(await childEdgeAB.exists(), "childEdgeAB").to.equal(false);
		});

		it("should have removable edges", async function() {
			await childEdgeAB.remove();

			expect(await childEdgeAB.exists()).to.equal(false);

			expect(await childEdgeAC.exists()).to.equal(true);

			expect(await childA.exists()).to.equal(true);
			expect(await childB.exists()).to.equal(true);
			expect(await childC.exists()).to.equal(true);

			expect(await asyncFrom(childA.getEdges(), (edge) => edge.id)).to.include(childEdgeAC.id).but.not.to.include(childEdgeAB.id);
			expect(await asyncFrom(childB.getEdges())).to.be.empty;
		});

		it("should persist over multiple opens", async function() {
			await backend.flush();

			let backend2 = new SQLiteMapBackend(backendFilename);
			await backend2.load();

			expect(await grandchildA.getPString("another string property")).to.equal(grandchildString);

			const grandchildA_again = await backend2.getNodeRef(grandchildA.id);
			expect(await grandchildA_again.getPString("another string property")).to.equal(grandchildString);

			const childEdgeAC_again = await backend2.getEdgeRef(childEdgeAC.id);
			expect(await asyncFrom(childEdgeAC_again.getNodes(), (node) => node.id)).has.members([childA.id, childC.id]);
		});
	});

	after(async function() {
		await fs.unlink(backendFilename);
	});
});

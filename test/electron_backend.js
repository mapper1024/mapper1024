const expect = require("chai").expect;
const tmp = require("tmp");
const _require = require("esm")(module);
const fs = require("fs/promises");
const { SQLiteMapBackend } = _require("../src/electron/sqlite_map_backend.js");
const { Vector3, asyncFrom } = _require("../mapper/index.js");

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
		backend = new SQLiteMapBackend(backendFilename, {create: true});
		await backend.load();
	});

	describe("properties", function() {
		const string = "the test string";
		const number = 0xCAFF00D;
		const vector3 = new Vector3(12.34, 56.78, 90.12);

		beforeEach(async function() {
			await backend.global.setPString("string property", string);
			await backend.global.setPNumber("number property", number);
			await backend.global.setPVector3("vector3 property", vector3);
		});

		it("should hold set values", async function() {
			expect(await backend.global.getPString("string property")).to.equal(string);
			expect(await backend.global.getPNumber("number property")).to.equal(number);
			expect(await backend.global.getPVector3("vector3 property")).to.deep.equal(vector3);
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
			expect(await asyncFrom(grandchildEdge.getNodes(), (node) => node.id)).has.members([grandchildA.id, grandchildB.id]);
		});

		it("should have fetchable edges", async function() {
			expect((await backend.getEdgeBetween(childA.id, childB.id)).id).to.equal(childEdgeAB.id);
			expect((await backend.getEdgeBetween(childB.id, childA.id)).id).to.equal(childEdgeAB.id);
			expect((await backend.getEdgeBetween(childC.id, childA.id)).id).to.equal(childEdgeAC.id);
			expect(await backend.getEdgeBetween(childC.id, childB.id)).to.equal(null);
		});

		it("should have removable nodes", async function() {
			await childB.remove();

			expect(await root.valid(), "root").to.equal(true);
			expect(await childA.valid(), "childA").to.equal(true);
			expect(await childC.valid(), "childC").to.equal(true);
			expect(await grandchildC.valid(), "grandchildC").to.equal(true);

			expect(await childEdgeAC.valid(), "childEdgeAC").to.equal(true);

			expect(await childB.valid(), "childB").to.equal(false);
			expect(await grandchildA.valid(), "grandchildA").to.equal(false);
			expect(await grandchildB.valid(), "grandchildB").to.equal(false);

			expect(await childEdgeAB.valid(), "childEdgeAB").to.equal(false);
		});

		it("should have removable edges", async function() {
			await childEdgeAB.remove();

			expect(await childEdgeAB.valid()).to.equal(false);

			expect(await childEdgeAC.valid()).to.equal(true);

			expect(await childA.valid()).to.equal(true);
			expect(await childB.valid()).to.equal(true);
			expect(await childC.valid()).to.equal(true);

			expect(await asyncFrom(childA.getEdges(), (edge) => edge.id)).to.include(childEdgeAC.id).but.not.to.include(childEdgeAB.id);
			expect(await asyncFrom(childB.getEdges())).to.be.empty;
		});

		it("should persist over multiple opens", async function() {
			backend.global.setPString("some property", "some value");
			await backend.flush();

			let backend2 = new SQLiteMapBackend(backendFilename);
			await backend2.load();

			expect(backend.global.id).to.equal(backend2.global.id);
			expect(await backend2.global.getPString("some property")).to.equal("some value");

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

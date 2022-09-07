const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, asyncFrom } = _require("../mapper/index.js");

export function testGenericBackend() {
	it("should have a version number", function() {
		expect(this.backend.getBackendVersionNumber()).to.be.above(0);
		expect(this.backend.getVersionNumber()).to.equal(this.backend.getBackendVersionNumber());
	});

	describe("properties", function() {
		const string = "the test string";
		const number = 0xCAFF00D;
		const vector3 = new Vector3(12.34, 56.78, 90.12);

		beforeEach(async function() {
			await this.backend.global.setPString("string property", string);
			await this.backend.global.setPNumber("number property", number);
			await this.backend.global.setPVector3("vector3 property", vector3);
		});

		it("should hold set values", async function() {
			expect(await this.backend.global.getPString("string property")).to.equal(string);
			expect(await this.backend.global.getPNumber("number property")).to.equal(number);
			expect(await this.backend.global.getPVector3("vector3 property")).to.deep.equal(vector3);
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
			root = await this.backend.createNode(null, "test");

			childA = await this.backend.createNode(root.id, "testA");
			childB = await this.backend.createNode(root.id, "testB");
			childC = await this.backend.createNode(root.id, "testC");

			grandchildA = await this.backend.createNode(childB.id, "test");
			grandchildB = await this.backend.createNode(childB.id, "test");
			grandchildC = await this.backend.createNode(childC.id, "test");

			await grandchildA.setPString("another string property", grandchildString);

			childEdgeAB = await this.backend.createEdge(childA.id, childB.id);
			childEdgeAC = await this.backend.createEdge(childA.id, childC.id);
			grandchildEdge = await this.backend.createEdge(grandchildB.id, grandchildA.id);
		});

		it("should have node trees", async function() {
			expect(await root.getParent()).to.equal(null);

			expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
			expect((await childB.getParent()).id, "childB parent").to.equal(root.id);

			expect((await grandchildA.getParent()).id, "grandchildA parent").to.equal(childB.id);
			expect((await grandchildB.getParent()).id, "grandchildB parent").to.equal(childB.id);

			expect(await asyncFrom(root.getChildren(), (child) => child.id)).has.members([childA.id, childB.id, childC.id]);
		});

		it("should have node types", async function() {
			expect(await root.getNodeType()).to.equal("test");
			expect(await childA.getNodeType()).to.equal("testA");
		});

		it("should have edges", async function() {
			expect(await asyncFrom(childA.getEdges(), (edge) => edge.id)).has.members([childEdgeAB.id, childEdgeAC.id]);
			expect(await asyncFrom(childA.getEdges(), async (edge) => (await edge.getOtherNode(childA.id)).id)).has.members([childB.id, childC.id]);
			expect(await asyncFrom(childA.getEdges(), async (edge) => (await edge.getDirOtherNode()).id)).has.members([childB.id, childC.id]);

			expect(await asyncFrom(childEdgeAC.getNodes(), (node) => node.id)).has.members([childA.id, childC.id]);
			expect(await asyncFrom(grandchildEdge.getNodes(), (node) => node.id)).has.members([grandchildA.id, grandchildB.id]);
		});

		it("should have fetchable edges", async function() {
			expect((await this.backend.getEdgeBetween(childA.id, childB.id)).id).to.equal(childEdgeAB.id);
			expect((await this.backend.getEdgeBetween(childB.id, childA.id)).id).to.equal(childEdgeAB.id);
			expect((await this.backend.getEdgeBetween(childC.id, childA.id)).id).to.equal(childEdgeAC.id);
			expect(await this.backend.getEdgeBetween(childC.id, childB.id)).to.equal(null);
		});

		it("should have removable nodes", async function() {
			await childB.remove();

			expect(await root.valid(), "root").to.equal(true);
			expect(await childA.valid(), "childA").to.equal(true);
			expect(await childC.valid(), "childC").to.equal(true);
			expect(await grandchildC.valid(), "grandchildC").to.equal(true);

			// Edges remain valid.
			expect(await childEdgeAC.valid(), "childEdgeAC").to.equal(true);
			expect(await childEdgeAB.valid(), "childEdgeAB").to.equal(true);

			// But will not longer be searched.
			expect(await asyncFrom(childA.getEdges(), (edge) => edge.id)).to.include(childEdgeAC.id).but.not.to.include(childEdgeAB.id);

			expect(await childB.valid(), "childB").to.equal(false);
			expect(await grandchildA.valid(), "grandchildA").to.equal(false);
			expect(await grandchildB.valid(), "grandchildB").to.equal(false);
		});

		it("should have unremovable nodes", async function() {
			await childB.remove();
			expect(await childB.valid()).to.equal(false);

			await childB.unremove();
			expect(await childB.valid()).to.equal(true);
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

			expect((await this.backend.getEdgeBetween(childA.id, childC.id)).id).to.equal(childEdgeAC.id);
			expect(await this.backend.getEdgeBetween(childA.id, childB.id)).to.equal(null);
		});

		it("should have unremovable edges", async function() {
			await childEdgeAB.remove();
			expect(await childEdgeAB.valid()).to.equal(false);

			await childEdgeAB.unremove();
			expect(await childEdgeAB.valid()).to.equal(true);
		});
	});
}

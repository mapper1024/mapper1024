const expect = require("chai").expect;
const _require = require("esm")(module);
const { testGenericBackend } = _require("./generic_backend.js");
const { SqlJsMapBackend } = _require("../mapper/index.js");

describe("SqlJsMapBackend", function() {
	beforeEach(async function() {
		this.backend = new SqlJsMapBackend();
		await this.backend.load();
	});

	testGenericBackend();

	it("should persist over multiple opens", async function() {
		await this.backend.global.setPString("some property", "some value");
		const root = await this.backend.createNode();

		const childA = await this.backend.createNode(root.id);
		const childB = await this.backend.createNode(root.id);

		const childEdgeAB = await this.backend.createEdge(childA.id, childB.id);

		this.backend2 = new SqlJsMapBackend({
			loadFrom: "data",
			data: await this.backend.getData(),
		});
		await this.backend2.load();

		expect(this.backend.global.id).to.equal(this.backend2.global.id);
		expect(await this.backend2.global.getPString("some property")).to.equal("some value");
		expect((await childA.getParent()).id, "childA parent").to.equal(root.id);
		expect((await this.backend2.getEdgeBetween(childA.id, childB.id)).id).to.equal(childEdgeAB.id);
	});
});

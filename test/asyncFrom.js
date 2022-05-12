const expect = require("chai").expect;
const _require = require("esm")(module);
const { asyncFrom } = _require("../mapper/index.js");

describe("asyncFrom", function() {
	async function* asyncGenerator() {
		for(const x of [1, 2, 3]) {
			yield x;
		}
	}

	it("should turn async generator into an array", async function() {
		expect(await asyncFrom(asyncGenerator())).to.have.members([1, 2, 3]);
	});

	it("should accept a synchronous map function", async function() {
		expect(await asyncFrom(asyncGenerator(), x => x * 2)).to.have.members([2, 4, 6]);
	});

	it("should accept an asynchronous map function", async function() {
		expect(await asyncFrom(asyncGenerator(), async x => x * 2)).to.have.members([2, 4, 6]);
	});
});

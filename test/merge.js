const expect = require("chai").expect;
const _require = require("esm")(module);
const { merge } = _require("../mapper/index.js");

describe("merge", function() {
	it("should merge", function() {
		expect(merge()).to.deep.equal({});
		expect(merge({a: 3, b: 5, c: 7})).to.deep.equal({a: 3, b: 5, c: 7});
		expect(merge({a: 3, b: 5, c: 7, z: 20}, {a: 4, b: 5, d: 9}, {a: 4, b: 5, d: 9, q: 12})).to.deep.equal({a: 4, b: 5, c: 7, d: 9, z: 20, q:12});
	});
});


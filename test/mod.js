const expect = require("chai").expect;
const _require = require("esm")(module);
const { mod } = _require("../mapper/index.js");

describe("mod", function() {
	it("should calculate mod", function() {
		expect(mod(7, 4)).to.equal(3);
		expect(mod(1, 1)).to.equal(0);
		expect(mod(3, 2)).to.equal(1);
		expect(mod(3, 3)).to.equal(0);
		expect(mod(-7, 2)).to.equal(1);
		expect(mod(-11, 7)).to.equal(3);
	});
});

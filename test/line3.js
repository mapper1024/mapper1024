const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, Line3 } = _require("../mapper/index.js");

describe("Line3", function() {
	it("should have minimums and maximums", function() {
		const a = new Line3(new Vector3(10, 20, 30), new Vector3(50, 5, 0));

		expect(a.fullMax()).to.deep.equal(new Vector3(50, 20, 30));
		expect(a.fullMin()).to.deep.equal(new Vector3(10, 5, 0));
	});

	it("should have distance", function() {
		const a = new Line3(new Vector3(1, -12, 8), new Vector3(3, -15, 14));

		expect(a.distanceSquared()).to.equal(49);
		expect(a.distance()).to.equal(7);
	});

	it("should detect 2D intersections", function() {
		const a = new Line3(new Vector3(-1, -1, 0), new Vector3(1, 1, 0));
		const b = new Line3(new Vector3(-1, 0, 0), new Vector3(1, 0, 0));
		const c = new Line3(new Vector3(-10, -4, 0), new Vector3(-5, 12, 0));

		expect(a.intersects2(b)).to.equal(true);
		expect(b.intersects2(a)).to.equal(true);
		expect(a.intersects2(c)).to.equal(false);
	});
});

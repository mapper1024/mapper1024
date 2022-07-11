const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, Line3 } = _require("../mapper/index.js");

describe("Line3", function() {
	it("should have minimums and maximums", function() {
		const a = new Line3(new Vector3(10, 20, 30), new Vector3(50, 5, 0));

		expect(a.fullMax()).to.deep.equal(new Vector3(50, 20, 30));
		expect(a.fullMin()).to.deep.equal(new Vector3(10, 5, 0));
	});

	it("should have map functions", function() {
		const a = new Line3(new Vector3(2, 4, 6), new Vector3(6, 12, 18));

		expect(a.map((v) => v.map((a) => a - 1))).to.deep.equal(new Line3(new Vector3(1, 3, 5), new Vector3(5, 11, 17)));
		expect(a.subtract(new Vector3(1, 1, 1))).to.deep.equal(new Line3(new Vector3(1, 3, 5), new Vector3(5, 11, 17)));
		expect(a.add(new Vector3(1, 1, 1))).to.deep.equal(new Line3(new Vector3(3, 5, 7), new Vector3(7, 13, 19)));
	});

	it("should convert to a vector", function() {
		const a = new Line3(new Vector3(1, 2, -3), new Vector3(4, 5, -6));
		expect(a.vector()).to.deep.equal(new Vector3(3, 3, -3));
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

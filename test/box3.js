const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, Line3, Box3 } = _require("../mapper/index.js");

describe("Box3", function() {
	it("should construct from a radius", function() {
		const a = Box3.fromRadius(new Vector3(10, 20, 30), 4);
		expect(a).to.deep.equal(new Box3(new Vector3(6, 16, 26), new Vector3(14, 24, 34)));
	});

	it("should construct from an offset", function() {
		const a = Box3.fromOffset(new Vector3(1, 1, 1), new Vector3(2, 2, 2));
		expect(a).to.deep.equal(new Box3(new Vector3(1, 1, 1), new Vector3(3, 3, 3)));
	});

	it("should scale", function() {
		const a = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
		expect(a.scale(2)).to.deep.equal(new Box3(new Vector3(2, 4, 6), new Vector3(8, 10, 12)));
	});

	it("should convert to line", function() {
		const a = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
		expect(a).to.deep.equal(new Line3(new Vector3(1, 2, 3), new Vector3(4, 5, 6)));
	});

	it("should map", function() {
		const a = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
		expect(a.map((v) => v.divideScalar(0.5))).to.deep.equal(new Box3(new Vector3(2, 4, 6), new Vector3(8, 10, 12)));
	});

	it("should have size", function() {
		const a = new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
		expect(a.size()).to.deep.equal(new Vector3(3, 3, 3));
	});

	it("should normalize", function() {
		const a = new Box3(new Vector3(4, 2, 6), new Vector3(1, 5, 3));
		expect(a.normalize()).to.deep.equal(new Box3(new Vector3(1, 2, 3), new Vector3(4, 5, 6)));
	});

	it("should collide", function() {
		const a = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
		const b = new Box3(new Vector3(0, 0, 0), new Vector3(3, 3, 3));
		const c = new Box3(new Vector3(2, 2, 2), new Vector3(4, 4, 4));
		expect(a.collides(b)).to.equal(true);
		expect(a.collides(c)).to.equal(false);
		expect(b.collides(c)).to.equal(true);
	});
});

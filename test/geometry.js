const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, Line3 } = _require("../mapper/index.js");

const DELTA = 0.000001;

describe("Vector3", function() {
	it("should add with other vectors", function() {
		const a = new Vector3(1, 6, 3);
		const b = new Vector3(4, 2, 8);

		expect(a.add(b)).to.deep.equal(new Vector3(5, 8, 11));
		expect(b.add(a)).to.deep.equal(new Vector3(5, 8, 11));
	});

	it("should subtract with other vectors", function() {
		const a = new Vector3(1, 6, 3);
		const b = new Vector3(4, 2, 8);

		expect(a.subtract(b)).to.deep.equal(new Vector3(-3, 4, -5));
		expect(b.subtract(a)).to.deep.equal(new Vector3(3, -4, 5));
	});

	it("should scale", function() {
		const a = new Vector3(1, 2, 3);

		expect(a.multiplyScalar(2)).to.deep.equal(new Vector3(2, 4, 6));
		expect(a.divideScalar(2)).to.deep.equal(new Vector3(0.5, 1, 1.5));
	});

	it("should have length", function() {
		const a = new Vector3(2, 3, 6);

		expect(Vector3.ZERO.length()).to.equal(0);
		expect(a.lengthSquared()).to.equal(49);
		expect(a.length()).to.equal(7);
	});

	it("should normalize", function() {
		const a = new Vector3(1, 2, 3);
		const length = Math.sqrt(14);

		expect(Vector3.ZERO.normalize()).to.deep.equal(Vector3.ZERO);

		const normalized = a.normalize();
		expect(normalized.length()).to.be.closeTo(1, DELTA);

		expect(normalized.x).to.be.closeTo(a.x / length, DELTA);
		expect(normalized.y).to.be.closeTo(a.y / length, DELTA);
		expect(normalized.z).to.be.closeTo(a.z / length, DELTA);
	});

	it("should create minimums and maximums", function() {
		const a = new Vector3(10, 20, 30);
		const b = new Vector3(50, 5, 0);

		expect(Vector3.max(a, b)).to.deep.equal(new Vector3(50, 20, 30));
		expect(Vector3.min(a, b)).to.deep.equal(new Vector3(10, 5, 0));
	});
});

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

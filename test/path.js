const expect = require("chai").expect;
const _require = require("esm")(module);
const { Vector3, Line3, Path } = _require("../mapper/index.js");

const DELTA = 0.000001;

describe("Path", function() {
	it("should have vertices", function() {
		const p = new Path(new Vector3(1, 2, 3));
		p.next(new Vector3(4, 5, 6));
		p.next(new Vector3(7, 8, 9));

		expect(Array.from(p.vertices())).to.have.deep.ordered.members([new Vector3(1, 2, 3), new Vector3(4, 5, 6), new Vector3(7, 8, 9)]);
	});

	it("should calculate center", function() {
		const p = new Path(new Vector3(1, 2, 3));
		p.next(new Vector3(4, 5, 6));
		p.next(new Vector3(7, 8, 12));

		expect(p.getCenter()).to.deep.equal(new Vector3(4, 5, 7));
	});

	it("should calculate radius", function() {
		const p = new Path(new Vector3(1, 2, 3));
		p.next(new Vector3(4, 5, 6));
		p.next(new Vector3(7, 8, 12));

		expect(p.getRadius()).to.be.closeTo(6.557438, DELTA);
	});

	it("should construct the most recent line as a path", function() {
		const p = new Path(new Vector3(1, 2, 3));
		p.next(new Vector3(4, 5, 6));
		p.next(new Vector3(7, 8, 9));

		expect(Array.from(p.asMostRecent().vertices())).to.have.deep.ordered.members([new Vector3(4, 5, 6), new Vector3(7, 8, 9)]);
	});

	it("should bisect lines", function() {
		const p = new Path(new Vector3(1, 2, 3));
		p.next(new Vector3(4, 5, 6));
		p.next(new Vector3(7, 8, 9));
		p.next(new Vector3(10, 11, 12));
		p.next(new Vector3(13, 14, 15));

		const b = p.withBisectedLines(2);

		let previousVertex;
		for(const vertex of b.vertices()) {
			if(previousVertex !== undefined) {
				const diff = vertex.subtract(previousVertex);

				expect(diff.length()).to.be.at.most(2);

				// Coordinates should be equal since the difference between the original vertices is (3, 3, 3).
				expect(diff.x).to.equal(diff.y);
				expect(diff.x).to.equal(diff.z);
			}
			previousVertex = vertex;
		}

		expect(Array.from(b.vertices())[0]).to.deep.equal(new Vector3(1, 2, 3));
		expect(b.lastVertex()).to.deep.equal(new Vector3(13, 14, 15));
	});
});

/** A vector in 3d space. */
class Vector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	toString() {
		return this.x.toString() + "," + this.y.toString() + "," + this.z.toString();
	}

	/** Construct a new vector from this vector plus another via vector addition.
	 * @param other {Vector3} another vector
	 * @returns this + other
	 */
	add(other) {
		return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
	}

	/** Construct a new vector from this vector minus another via vector subtraction.
	 * @param other {Vector3} another vector
	 * @returns this - other
	 */
	subtract(other) {
		return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
	}

	/**
	 * Construct a new vector from this vector multiplied by a scalar value.
	 * @param scalar
	 * @returns {Vector3}
	 */
	multiplyScalar(scalar) {
		return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
	}

	/**
	 * Construct a new vector from this vector divided by a scalar value.
	 * @param scalar
	 * @returns {Vector3}
	 */
	divideScalar(scalar) {
		return this.multiplyScalar(1 / scalar);
	}

	/** Get the length of this vector, squared.
	 * May be used for length comparisons without needing to calculate the actual length using square root.
	 * @returns {number}
	 */
	lengthSquared() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	/** Get the length of this vector.
	 * @returns {number}
	 */
	length() {
		return Math.sqrt(this.lengthSquared());
	}

	/** Construct a new normalized vector based on this one.
	 * That is, scales this vector by a scalar so that its length equals one.
	 * If the original vector's length is zero, then the normalized vector will be the zero vector.
	 * @returns {Vector3} the normalized vector.
	 */
	normalize() {
		const length = this.length();
		return (length === 0) ? Vector3.ZERO : this.divideScalar(length);
	}

	static min(a, b) {
		return new Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
	}

	static max(a, b) {
		return new Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
	}

	/** Construct a vector with the values of this vector rounded to the nearest integer (that is, floor of the 0.5 + the value).
	 * @return {Vector3}
	 */
	round() {
		return this.map((a) => Math.floor(a + 0.5));
	}

	/** Construct a vector with the values of this vector passed through the specified function.
	 * @param f {function} a function accepting a number and returning the mapped number. Will be applied to all coordinates.
	 * @return {Vector3}
	 */
	map(f) {
		return new Vector3(f(this.x), f(this.y), f(this.z));
	}
}

Vector3.ZERO = new Vector3(0, 0, 0);
Vector3.UNIT = new Vector3(1, 1, 1);

/** A line from one {Vector3} to another. */
class Line3 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}

	/** Apply a function to each point on the line and construct a new line from the result.
	 * @param f {function} a function accepting a {Vector3} and returning the mapped vector.
	 * @returns {Line3}
	 */
	map(f) {
		return new Line3(f(this.a), f(this.b));
	}

	/** Construct a new line based on this line with both points having an offset added.
	 * @param offset {Vector3}
	 * @returns {Line3}
	 */
	add(offset) {
		return this.map((v) => v.add(offset));
	}

	/** Construct a new line based on this line with both points having an offset subtracted.
	 * @param offset {Vector3}
	 * @returns {Line3}
	 */
	subtract(offset) {
		return this.map((v) => v.subtract(offset));
	}

	/** Construct a new line from both points of this line multiplied by a scalar value.
	 * @param scalar {number}
	 * @returns {Line3}
	 */
	multiplyScalar(scalar) {
		return this.map((v) => v.multiplyScalar(scalar));
	}

	/** Construct a new line from both points of this line divided by a scalar value.
	 * @param scalar {number}
	 * @returns {Line3}
	 */
	divideScalar(scalar) {
		return this.map((v) => v.divideScalar(scalar));
	}

	/** Convert the line to a vector from point A to point B. That is the vector that, when added to A, produces B.
	 * @returns {Vector3}
	 */
	vector() {
		return this.b.subtract(this.a);
	}

	fullMin() {
		return Vector3.min(this.a, this.b);
	}

	fullMax() {
		return Vector3.max(this.a, this.b);
	}

	distance() {
		return this.a.subtract(this.b).length();
	}

	distanceSquared() {
		return this.a.subtract(this.b).lengthSquared();
	}

	intersects2(other) {
		const a = this.a;
		const b = this.b;
		const c = other.a;
		const d = other.b;

		var det, gamma, lambda;
		det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);
		if (det === 0) {
			return false;
		} else {
			lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
			gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
			return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
		}
	}
}

Line3.ZERO = new Line3(Vector3.ZERO, Vector3.ZERO);

/** A rectangular bounded by two corners. */
class Box3 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}

	/** Construct a new square Box3 with a central vector and a "radius" that is added and subtracted from every coordinate of that vector to form opposite corners of the box.
	 * @param center {Vector3}
	 * @param radius {number}
	 * @returns {Box3}
	 */
	static fromRadius(center, radius) {
		const radiusVector = Vector3.UNIT.multiplyScalar(radius);
		return new Box3(center.subtract(radiusVector), center.add(radiusVector));
	}

	/** Construct a new Box3 by adding an offset to the first corner.
	 * @param start {Vector3} the first corner of the box
	 * @param offset {Vector3} the offset added to the first corner to form the second corner
	 * @returns {Box3}
	 */
	static fromOffset(start, offset) {
		return new Box3(start, start.add(offset));
	}

	/** Scale both vectors in the box by a scalar.
	 * @param scalar {number}
	 * @returns {Box3}
	 */
	scale(scalar) {
		return new Box3(this.a.multiplyScalar(scalar), this.b.multiplyScalar(scalar));
	}

	/** Get the Line3 running between the corners of the box.
	 * @returns {Line3}
	 */
	line() {
		return new Line3(this.a, this.b);
	}

	/** Apply function f to the corners of the box. Constructs a new Box3.
	 * @param f {function} a function that accepts a {Vector3} and returns the modified {Vector3}.
	 * @returns {Box3}
	 */
	map(f) {
		return new Box3(f(this.a), f(this.b));
	}
}

/** A set of connected vertices */
class Path {
	/** Start the path with an initial vertex.
	 * @param startPoint {Vector3}
	 */
	constructor(startPoint) {
		this.lines = [];
		this.origin = startPoint;
		this.at = Vector3.ZERO;
	}

	mapOrigin(f) {
		const path = new Path(f(this.origin));
		path.lines = this.lines;
		path.at = this.at;
		return path;
	}

	mapLines(f) {
		const path = new Path(this.origin);
		path.lines = this.lines.map((line) => line.map(f));
		path.at = f(this.at);
		return path;
	}

	/** Construct a path based on this one where the distance between vertices is limited by a specific radius.
	 * If any particular line between two vertices is too long, it will be recursive split with a new vertex between them until no line is too long.
	 * @param radius {number} the distance between consecutive vertices will always be at most this value
	 * @returns {Path}
	 */
	withBisectedLines(radius) {
		const path = new Path(this.origin);

		function addBisectedLine(line) {
			if(line.distance() >= radius) {
				const middle = line.a.add(line.b).divideScalar(2);
				const lineA = new Line3(line.a, middle);
				const lineB = new Line3(middle, line.b);
				addBisectedLine(lineA);
				addBisectedLine(lineB);
			}
			else {
				path.lines.push(line);
			}
		}

		for(const line of this.lines) {
			addBisectedLine(line);
		}

		path.at = this.at;
		return path;
	}

	/** Add a point to the path.
	 * @param nextPoint {Vector3}
	 */
	next(nextPoint) {
		const nextRelativePoint = nextPoint.subtract(this.origin);
		if(this.at.subtract(nextRelativePoint).lengthSquared() > 0) {
			this.lines.push(new Line3(this.at, nextRelativePoint));
			this.at = nextRelativePoint;
		}
	}

	lastLine() {
		const lastLine = this.lines[this.lines.length - 1];
		return lastLine ? lastLine : Line3.ZERO;
	}

	/** Get the last vertex in the path.
	 * @returns {Vector3}
	 */
	lastVertex() {
		return this.lastLine().b.add(this.origin);
	}

	pop() {
		const lastLine = this.lines.pop();
		return lastLine ? lastLine : Line3.ZERO;
	}

	push(line) {
		return this.lines.push(line);
	}

	/** Get all vertices of the path in addition order, starting with the origin.
	 * @returns {AsyncIterable.<Vector3>}
	 */
	* vertices() {
		yield this.origin;
		for(const line of this.lines) {
			yield line.b.add(this.origin);
		}
	}

	/** Get center of the path --- the mean of all vertices.
	 * @returns {Vector3}
	 */
	getCenter() {
		const vertices = Array.from(this.vertices());
		let sum = Vector3.ZERO;
		for(const vertex of vertices) {
			sum = sum.add(vertex);
		}
		return sum.divideScalar(vertices.length);
	}

	/** Get the distance from the center of the path to the furthest vertex.
	 * @returns {number}
	 */
	getRadius() {
		const center = this.getCenter();
		let furthest = center;
		for(const vertex of this.vertices()) {
			if(vertex.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
				furthest = vertex;
			}
		}
		return furthest.subtract(center).length();
	}

	/** Get a new {Path} with only the last line of this path.
	 * @returns {Path}
	 */
	asMostRecent() {
		const lastLine = this.lastLine();
		const path = new Path(this.origin.add(lastLine.a));
		path.next(this.origin.add(lastLine.b));
		return path;
	}
}

const dirs = {};

dirs.N = new Vector3(0, -1, 0);
dirs.S = new Vector3(0, 1, 0);
dirs.W = new Vector3(-1, 0, 0);
dirs.E = new Vector3(1, 0, 0);

dirs.NW = dirs.N.add(dirs.W);
dirs.NE = dirs.N.add(dirs.E);
dirs.SW = dirs.S.add(dirs.W);
dirs.SE = dirs.S.add(dirs.E);

const dirKeys = Object.keys(dirs);

const normalizedDirs = {};

for(const dirName of dirKeys) {
	normalizedDirs[dirName] = dirs[dirName].normalize();
}

const dirAngles = {};
for(const dirName of dirKeys) {
	const dir = dirs[dirName];
	dirAngles[dirName] = Math.atan2(dir.y, dir.x);
}

export { Vector3, Line3, Box3, Path, dirs, dirKeys, normalizedDirs, dirAngles };

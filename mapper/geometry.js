class Vector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	toString() {
		return this.x.toString() + "," + this.y.toString() + "," + this.z.toString();
	}

	add(other) {
		return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
	}

	subtract(other) {
		return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
	}

	multiplyScalar(scalar) {
		return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
	}

	divideScalar(scalar) {
		return this.multiplyScalar(1 / scalar);
	}

	lengthSquared() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	length() {
		return Math.sqrt(this.lengthSquared());
	}

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

	round() {
		return this.map((a) => Math.floor(a + 0.5));
	}

	map(f) {
		return new Vector3(f(this.x), f(this.y), f(this.z));
	}
}

Vector3.ZERO = new Vector3(0, 0, 0);
Vector3.UNIT = new Vector3(1, 1, 1);

class Line3 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}

	map(f) {
		return new Line3(f(this.a), f(this.b));
	}

	add(offset) {
		return this.map((v) => v.add(offset));
	}

	subtract(offset) {
		return this.map((v) => v.subtract(offset));
	}

	multiplyScalar(scalar) {
		return this.map((v) => v.multiplyScalar(scalar));
	}

	divideScalar(scalar) {
		return this.map((v) => v.divideScalar(scalar));
	}

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

class Box3 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}

	static fromRadius(center, radius) {
		const radiusVector = Vector3.UNIT.multiplyScalar(radius);
		return new Box3(center.subtract(radiusVector), center.add(radiusVector));
	}

	scale(scalar) {
		return new Box3(this.a.multiplyScalar(scalar), this.b.multiplyScalar(scalar));
	}

	line() {
		return new Line3(this.a, this.b);
	}

	map(f) {
		return new Box3(f(this.a), f(this.b));
	}
}

class Path {
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
	}

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

	* vertices() {
		yield this.at.add(this.origin);
		for(const line of this.lines) {
			yield line.b.add(this.origin);
		}
	}

	getCenter() {
		const vertices = Array.from(this.vertices());
		let sum = Vector3.ZERO;
		for(const vertex of vertices) {
			sum = sum.add(vertex);
		}
		return sum.divideScalar(vertices.length);
	}

	getRadius() {
		const center = this.getCenter();
		let furthest = this.getCenter();
		for(const vertex of this.vertices()) {
			if(vertex.subtract(center).lengthSquared() >= furthest.subtract(center).lengthSquared()) {
				furthest = vertex;
			}
		}
		return furthest.subtract(center).length();
	}

	asMostRecent() {
		const lastLine = this.lastLine();
		const path = new Path(this.origin.add(lastLine.a));
		path.next(this.origin.add(lastLine.b));
		return path;
	}
}

export { Vector3, Line3, Box3, Path };

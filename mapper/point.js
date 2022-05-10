class Point {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	static add(a, b) {
		return new Point(a.x + b.x, a.y + b.y, a.z + b.z);
	}

	static subtract(a, b) {
		return new Point(a.x - b.x, a.y - b.y, a.z - b.z);
	}

	static scalarMultiply(a, s) {
		return new Point(a.x * s, a.y * s, a.z * s);
	}

	static negate(a) {
		return Point.scalarMultiply(a, -1);
	}
}

export { Point };

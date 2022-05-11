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

	static distanceSquared(a, b) {
		const d = Point.subtract(a, b);
		return d.x * d.x + d.y * d.y + d.z * d.z;
	}

	static distance(a, b) {
		return Math.sqrt(Point.distanceSquared(a, b));
	}

	static normalize(a) {
		return Point.scalarMultiply(a, 1 / Point.distance(Point.ZERO, a));
	}

	static min(a, b) {
		return new Point(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
	}

	static max(a, b) {
		return new Point(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
	}

	static lineIntersects(a, b, c, d) {
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

Point.ZERO = new Point(0, 0, 0);

export { Point };

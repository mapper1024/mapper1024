class Vector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
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
}

Vector3.ZERO = new Vector3(0, 0, 0);

class Line3 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
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
		return this.a.subtract(this.b).length();
	}

	intersects(other) {
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

export { Vector3, Line3 };

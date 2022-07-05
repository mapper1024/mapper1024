class Color {
	constructor(r, g, b, a) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	static fromRGB(r, g, b) {
		return new this(r, g, b, 1);
	}

	toCSS() {
		const r = this.r * 255;
		const g = this.g * 255;
		const b = this.b * 255;
		const a = this.a;
		return `rgba(${r},${g},${b},${a})`
	}
}

export { Color };

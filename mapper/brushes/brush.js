class Brush {
	constructor(context) {
		this.context = context;

		this.size = 1;
		this.maxSize = 10;
		this.lastSizeChange = performance.now();
	}

	getDescription() {
		throw "description not implemented";
	}

	getRadius() {
		return this.size * 25;
	}

	sizeInMeters() {
		return this.context.mapper.unitsToMeters(this.context.pixelsToUnits(this.getRadius()));
	}

	increment() {}

	decrement() {}

	shrink() {
		this.size = Math.max(1, this.size - 1);
		this.lastSizeChange = performance.now();
	}

	enlarge() {
		this.size = Math.min(this.maxSize, this.size + 1);
		this.lastSizeChange = performance.now();
	}

	sizeRecentlyChanged() {
		return performance.now() - this.lastSizeChange < 1000;
	}

	async drawAsCircle(context, position) {
		context.beginPath();
		context.arc(position.x, position.y, this.getRadius(), 0, 2 * Math.PI, false);
		context.strokeStyle = "white";
		context.stroke();

		context.fillStyle = "white";
		context.fillRect(position.x - this.getRadius(), position.y - 16, 2, 32);
		context.fillRect(position.x + this.getRadius(), position.y - 16, 2, 32);
		context.fillRect(position.x - this.getRadius(), position.y - 1, this.getRadius() * 2, 2);

		context.font = "12px mono";
		const text = `${this.sizeInMeters() * 2}m`;
		context.fillText(text, position.x - context.measureText(text).width / 2, position.y - 6);
	}

	async draw(context, position) {
		await this.drawAsCircle(context, position);
	}

	async trigger(where, mouseDragEvent) {
		where;
		mouseDragEvent;
	}

	async activate(where) {
		where;
	}
}

export { Brush };

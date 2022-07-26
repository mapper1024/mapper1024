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

		context.textBaseline = "alphabetic";
		context.font = "12px mono";
		const sizeText = `${this.sizeInMeters() * 2}m`;
		context.fillText(sizeText, position.x - context.measureText(sizeText).width / 2, position.y - 6);

		context.textBaseline = "top";
		const worldPosition = this.context.canvasPointToMap(position).map(c => this.context.mapper.unitsToMeters(c)).round();
		const positionText = `${worldPosition.x}m, ${worldPosition.y}m`;
		context.fillText(positionText, position.x - Math.min(this.getRadius(), context.measureText(positionText).width / 2), position.y + this.getRadius() + 6);
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

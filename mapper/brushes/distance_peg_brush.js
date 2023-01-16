import { Brush } from "./brush.js";

class DistancePegBrush extends Brush {
	constructor(context, n) {
		super(context);
		this.n = n;
	}

	displayButton(button) {
		button.innerText = `Peg (${this.n})`;
		button.title = `${this.getDescription()} [shortcut: '${this.n}']`;
	}

	getDescription() {
		return `Distance Peg (${this.n})`;
	}

	async draw(context, position) {
		context.beginPath();
		context.arc(position.x, position.y, 4, 0, 2 * Math.PI, false);
		context.fillStyle = "white";
		context.fill();

		context.textBaseline = "alphabetic";
		context.font = "16px mono";
		const sizeText = `Placing Distance Peg ${this.n}`;
		context.fillText(sizeText, position.x - context.measureText(sizeText).width / 2, position.y - 16);

		context.textBaseline = "top";
		const worldPosition = this.context.canvasPointToMap(position).map(c => this.context.mapper.unitsToMeters(c)).round();
		const positionText = `${worldPosition.x}m, ${worldPosition.y}m, ${this.context.mapper.unitsToMeters(await this.context.getCursorAltitude())}m`;
		context.fillText(positionText, position.x - context.measureText(positionText).width / 2, position.y + 16);
	}

	async activate(where) {
		this.context.distanceMarkers[this.n] = this.context.canvasPointToMap(where);
	}
}

export { DistancePegBrush };

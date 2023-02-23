import { Brush } from "./brush.js";

class DistancePegBrush extends Brush {
	constructor(context, n) {
		super(context);
		this.n = n;
	}

	displayButton(button) {
		button.innerText = `Distance Peg (${this.n})`;
		button.title = `Measure distance [shortcut: '${this.n}']`;
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

	async displaySidebar(brushbar, container) {
		const make = async () => {
			const a = this.context.distanceMarkers[1];
			const b = this.context.distanceMarkers[2];

			if(a && b) {
				const meters = this.context.mapper.unitsToMeters(a.subtract(b).length());
				container.innerText = `Distance between markers: ${Math.floor(meters + 0.5)}m (${Math.floor(meters / 1000 + 0.5)}km)`;
			}
			else if(a || b) {
				container.innerText = "Place the other marker to calculate distance";
			}
			else {
				container.innerText = "Place the first marker to calculate distance";
			}
		};

		await make();
		this.hooks.add("context_distance_marker_update", make);
	}

	async activate(where) {
		this.context.distanceMarkers[this.n] = this.context.canvasPointToMap(where);
		this.context.hooks.call("distance_marker_update", this.n, where);
	}
}

export { DistancePegBrush };

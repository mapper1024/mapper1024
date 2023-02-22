import { Brush } from "./brush.js";
import { NullAction } from "../actions/index.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { Box3 } from "../geometry.js";

class RectangleSelectBrush extends Brush {
	constructor(context) {
		super(context);

		this.box = undefined;
	}

	async draw(context, where) {
		context.beginPath();
		context.arc(where.x, where.y, 4, 0, 2 * Math.PI, false);
		context.fillStyle = "white";
		context.fill();

		if(this.box) {
			const boxOnCanvas = this.box.map(v => this.context.mapPointToCanvas(v));
			const boxSize = boxOnCanvas.b.subtract(boxOnCanvas.a);
			context.globalAlpha = 0.5;
			context.fillStyle = "black";
			context.fillRect(boxOnCanvas.a.x, boxOnCanvas.a.y, boxSize.x, boxSize.y);
			context.globalAlpha = 1;
		}
	}

	absoluteCanvasBox() {
		return this.box.map(v => this.context.mapPointToAbsoluteCanvas(v).map(c => Math.floor(c)));
	}

	async displaySidebar(brushbar, container) {
		const make = async () => {
			if(this.box) {
				const meterBox = this.box.map(v => v.map(c => this.context.mapper.unitsToMeters(c)));
				const absoluteCanvasBox = this.absoluteCanvasBox();
				container.innerText = `${absoluteCanvasBox.size().x}x${absoluteCanvasBox.size().y} pixels at zoom level ${this.context.zoom}\n${(meterBox.size().x / 1000 * meterBox.size().y / 1000).toFixed(2)} km²`;
			}
			else {
				container.innerText = "Click and drag to select an area to export";
			}
		};

		await make();
		this.hooks.add("change_box", make);
		this.hooks.add("context_changed_zoom", make);
	}

	async trigger(drawEvent) {
		const startOnMap = this.context.canvasPointToMap(drawEvent.path.origin);
		const whereOnMap = this.context.canvasPointToMap(drawEvent.path.lastVertex());
		this.box = (new Box3(startOnMap, whereOnMap)).normalize();
		this.hooks.call("change_box", this.box);
		return new NullAction(this.context);
	}

	async activate(where) {
		const whereOnMap = this.context.canvasPointToMap(where);
		this.box = new Box3(whereOnMap, whereOnMap);
		return new DrawEvent(this.context, where);
	}
}

export { RectangleSelectBrush };

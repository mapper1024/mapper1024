import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { Action, BulkAction } from "../actions/index.js";
import { tileSize } from "../node_render.js";
import { Box3, Vector3 } from "../geometry.js";

class RectangleSelectBrush extends Brush {
	constructor(context) {
		super(context);
	}

	async draw(context, where) {
		context.beginPath();
		context.arc(where.x, where.y, 4, 0, 2 * Math.PI, false);
		context.fillStyle = "white";
		context.fill();
	}
}

export { RectangleSelectBrush };

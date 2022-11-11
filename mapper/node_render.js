import { Vector3 } from "./geometry.js";

class NodeRender {
	constructor(context, nodeRef) {
		this.context = context;
		this.nodeRef = nodeRef;
		this.renders = {};
	}

	async getLayers(oneUnitInPixels) {
		let render = this.renders[oneUnitInPixels];
		if(render === undefined) {
			const toRender = [];

			let topLeftCorner = new Vector3(Infinity, Infinity, Infinity);
			let bottomRightCorner = new Vector3(-Infinity, -Infinity, -Infinity);

			for await(const childNodeRef of this.nodeRef.getChildren()) {
				const point = (await childNodeRef.getCenter()).map((c) => this.context.unitsToPixels(c));
				topLeftCorner = Vector3.min(topLeftCorner, point);
				bottomRightCorner = Vector3.max(bottomRightCorner, point);

				toRender.push({
					point: point,
				});
			}

			const canvas = document.createElement("canvas");
			canvas.width = bottomRightCorner.x - topLeftCorner.x;
			canvas.height = bottomRightCorner.y - topLeftCorner.y;
			const c = canvas.getContext("2d");

			for(const part of toRender) {
				const point = part.point.subtract(topLeftCorner);
				c.beginPath();
				c.rect(point.x, point.y, 16, 16);
				c.fillStyle = "red";
				c.fill();
			}

			render = this.renders[oneUnitInPixels] = [
				{
					corner: topLeftCorner,
					z: 0,
					canvas: canvas,
				},
			];
		}
		return render;
	}
}

export { NodeRender };

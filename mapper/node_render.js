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
				const radiusInPixels = this.context.unitsToPixels(await childNodeRef.getRadius());
				const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels);
				const point = (await childNodeRef.getCenter()).map((c) => this.context.unitsToPixels(c));
				topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
				bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

				toRender.push({
					point: point,
					radius: radiusInPixels,
				});
			}

			const canvas = document.createElement("canvas");
			canvas.width = bottomRightCorner.x - topLeftCorner.x;
			canvas.height = bottomRightCorner.y - topLeftCorner.y;
			const c = canvas.getContext("2d");

			for(const part of toRender) {
				const point = part.point.subtract(topLeftCorner);
				c.beginPath();
				c.arc(point.x, point.y, part.radius, 0, 2 * Math.PI, false);
				c.fillStyle = (await this.nodeRef.getType()).getColor();
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

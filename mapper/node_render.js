import { Vector3 } from "./geometry.js";
import { images } from "./images/index.js";

class NodeRender {
	constructor(context, nodeRef) {
		this.context = context;
		this.nodeRef = nodeRef;
		this.renders = {};
	}

	async getNodeTypeFillStyle(context, nodeType) {
		const imageName = await nodeType.getImageName();
		if(imageName) {
			return context.createPattern(await images[imageName].image, "repeat");
		}
		else {
			return nodeType.getColor();
		}
	}

	async getLayers(oneUnitInPixels) {
		let render = this.renders[oneUnitInPixels];
		if(render === undefined) {
			render = [];

			if(this.context.unitsToPixels(await this.nodeRef.getRadius()) >= 1) {

				const layers = {};

				for await(const childNodeRef of this.nodeRef.getChildren()) {
					const z = (await childNodeRef.getCenter()).z;
					let layer = layers[z];
					if(layer === undefined) {
						layers[z] = layer = [];
					}
					layer.push(childNodeRef);
				}

				for(const z in layers) {
					const children = layers[z];
					const toRender = [];

					let topLeftCorner = new Vector3(Infinity, Infinity, Infinity);
					let bottomRightCorner = new Vector3(-Infinity, -Infinity, -Infinity);

					const focusTiles = {};
					const tileSize = 16;

					for(const childNodeRef of children) {
						const radiusInPixels = this.context.unitsToPixels(await childNodeRef.getRadius());
						const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels);
						const point = (await childNodeRef.getEffectiveCenter()).map((c) => this.context.unitsToPixels(c));

						topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
						bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

						toRender.push({
							nodeRef: childNodeRef,
							point: point,
							radius: radiusInPixels,
						});
					}

					topLeftCorner = topLeftCorner.map(Math.floor).map((c) => c - c % tileSize);

					for(const part of toRender) {
						part.point = part.point.subtract(topLeftCorner);

						for(let r = 0; r < Math.PI * 2; r += 8 / part.radius) {
							const tilePos = (new Vector3(Math.cos(r), Math.sin(r), 0)).multiplyScalar(part.radius).add(part.point).divideScalar(tileSize).map(Math.floor);
							let tilesX = focusTiles[tilePos.x];
							if(tilesX === undefined) {
								tilesX = focusTiles[tilePos.x] = {};
							}
							let tilesY = tilesX[tilePos.y];
							if(tilesY === undefined) {
								tilesY = tilesX[tilePos.y] = [];
							}
							tilesY.push(part.nodeRef);
						}
					}

					const canvas = document.createElement("canvas");
					canvas.width = bottomRightCorner.x - topLeftCorner.x;
					canvas.height = bottomRightCorner.y - topLeftCorner.y;
					if(canvas.width === 0 || canvas.height === 0) {
						continue;
					}
					const c = canvas.getContext("2d");

					c.fillStyle = await this.getNodeTypeFillStyle(c, await this.nodeRef.getType());

					for(const part of toRender) {
						const point = part.point;
						c.beginPath();
						c.arc(point.x, point.y, part.radius, 0, 2 * Math.PI, false);
						c.fill();
					}

					c.strokeStyle = "black";

					for(const tX in focusTiles) {
						const tilesX = focusTiles[tX];
						for(const tY in tilesX) {
							const tile = tilesX[tY];
							const point = new Vector3(tX, tY, 0).multiplyScalar(tileSize);
							c.strokeRect(point.x, point.y, tileSize, tileSize);
						}
					}

					render.push({
						corner: topLeftCorner,
						z: z,
						canvas: canvas,
						focusTiles: focusTiles,
					});
				}
			}

			this.renders[oneUnitInPixels] = render;
		}
		return render;
	}
}

export { NodeRender };

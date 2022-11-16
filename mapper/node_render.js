import { Vector3 } from "./geometry.js";
import { images } from "./images/index.js";

const tileSize = 16;

class NodeRender {
	constructor(context, nodeRef) {
		this.context = context;
		this.nodeRef = nodeRef;
		this.renders = {};
	}

	static async getNodeTypeFillStyle(context, nodeType) {
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

					for(const childNodeRef of children) {
						const radiusInPixels = this.context.unitsToPixels(await childNodeRef.getRadius());
						const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels);
						const point = (await childNodeRef.getEffectiveCenter()).map((c) => this.context.unitsToPixels(c));

						topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
						bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

						toRender.push({
							nodeRef: childNodeRef,
							absolutePoint: point,
							radius: radiusInPixels,
						});
					}

					// Align the node render to the tile grid.
					topLeftCorner = topLeftCorner.map(Math.floor).map((c) => c - c % tileSize);

					for(const part of toRender) {
						part.point = part.absolutePoint.subtract(topLeftCorner);

						/* Calculate all potential focus tiles for this part.
						 * Potential focus tiles lie along the outer radius of the part. */
						for(let r = 0; r < Math.PI * 2; r += 8 / part.radius) {
							const pos = (new Vector3(Math.cos(r), Math.sin(r), 0)).multiplyScalar(part.radius).add(part.point);
							const tilePos = pos.divideScalar(tileSize).map(Math.floor);
							let tilesX = focusTiles[tilePos.x];
							if(tilesX === undefined) {
								tilesX = focusTiles[tilePos.x] = {};
							}

							tilesX[tilePos.y] = {
								point: pos,
							};
						}
					}

					/* Loop through all focus tiles and delete those that fall fully within another part;
					 * they would certainly not be borders. */
					for(const tX in focusTiles) {
						const focusTilesX = focusTiles[tX];
						for(const tY in focusTilesX) {
							const tile = focusTilesX[tY];
							const point = tile.point;
							for(const part of toRender) {
								if(part.point.subtract(point).length() < part.radius - tileSize) {
									delete focusTilesX[tY];
									break;
								}
							}
						}
					}

					const canvas = document.createElement("canvas");
					canvas.width = bottomRightCorner.x - topLeftCorner.x;
					canvas.height = bottomRightCorner.y - topLeftCorner.y;
					if(canvas.width === 0 || canvas.height === 0) {
						continue;
					}
					const c = canvas.getContext("2d");

					c.fillStyle = await NodeRender.getNodeTypeFillStyle(c, await this.nodeRef.getType());

					for(const part of toRender) {
						const point = part.point;
						c.beginPath();
						c.arc(point.x, point.y, part.radius, 0, 2 * Math.PI, false);
						c.fill();
					}

					render.push({
						corner: topLeftCorner,
						z: z,
						canvas: canvas,
						focusTiles: focusTiles,
						parts: toRender,
					});
				}
			}

			this.renders[oneUnitInPixels] = render;
		}
		return render;
	}
}

export { NodeRender, tileSize };

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

	async getLayers(zoom) {
		let render = this.renders[zoom];
		if(render === undefined) {
			render = [];

			const drawType = (await this.nodeRef.getLayer()).getDrawType();
			const areaDrawType = drawType === "area";

			if(this.context.unitsToPixels(await this.nodeRef.getRadius()) >= 1) {

				const layerZ = (await this.nodeRef.getLayer()).getZ();

				const layers = {};

				for await(const childNodeRef of this.nodeRef.getChildren()) {
					const z = areaDrawType ? (await childNodeRef.getCenter()).z : 0;
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
						const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels).noZ();
						const point = (await childNodeRef.getEffectiveCenter()).map((c) => this.context.unitsToPixels(c)).noZ();

						topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
						bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

						toRender.push({
							nodeRef: childNodeRef,
							layer: await childNodeRef.getLayer(),
							absolutePoint: point,
							radius: radiusInPixels,
						});
					}

					// Align the node render to the tile grid.
					topLeftCorner = topLeftCorner.map(Math.floor).map((c) => c - c % tileSize);
					bottomRightCorner = bottomRightCorner.map(Math.ceil);

					for(const part of toRender) {
						part.point = part.absolutePoint.subtract(topLeftCorner);

						/* Calculate all potential focus tiles for this part.
						 * Potential focus tiles lie along the outer radius of the part. */
						for(let r = 0; r < Math.PI * 2; r += 8 / part.radius) {
							const pos = (new Vector3(Math.cos(r), Math.sin(r), 0)).multiplyScalar(part.radius - 1).add(part.absolutePoint);
							const tilePos = pos.divideScalar(tileSize).map(Math.floor);
							let tilesX = focusTiles[tilePos.x];
							if(tilesX === undefined) {
								tilesX = focusTiles[tilePos.x] = {};
							}

							const absolutePoint = tilePos.multiplyScalar(tileSize);

							tilesX[tilePos.y] = {
								absolutePoint: absolutePoint,
								centerPoint: absolutePoint.add(new Vector3(tileSize / 2, tileSize / 2, 0)),
								part: part,
								layer: await part.nodeRef.getLayer(),
								nodeType: await part.nodeRef.getType(),
							};
						}
					}

					const focusTileEliminationDistance = areaDrawType ? tileSize * 2 : tileSize;

					/* Loop through all focus tiles and delete those that fall fully within another part;
					 * they would certainly not be borders. */
					for(const tX in focusTiles) {
						const focusTilesX = focusTiles[tX];
						for(const tY in focusTilesX) {
							const tile = focusTilesX[tY];
							const point = tile.centerPoint;
							for(const part of toRender) {
								if(part.absolutePoint.subtract(point).length() < part.radius - focusTileEliminationDistance) {
									delete focusTilesX[tY];
									break;
								}
							}
						}
					}

					const miniCanvasSize = 2048;
					const totalCanvasSize = new Vector3(bottomRightCorner.x - topLeftCorner.x, bottomRightCorner.y - topLeftCorner.y, 0);
					if(totalCanvasSize.x === 0 || totalCanvasSize.y === 0) {
						continue;
					}

					const miniCanvasLimit = totalCanvasSize.divideScalar(miniCanvasSize).map(Math.floor);
					for(let x = 0; x <= miniCanvasLimit.x; x++) {
						for(let y = 0; y <= miniCanvasLimit.y; y++) {
							const offset = new Vector3(x, y, 0).multiplyScalar(miniCanvasSize);

							const width = Math.min(miniCanvasSize, totalCanvasSize.x - offset.x);
							const height = Math.min(miniCanvasSize, totalCanvasSize.y - offset.y);

							let canvas;

							const canvasFunction = async () => {
								if(canvas) {
									return canvas;
								}

								canvas = document.createElement("canvas");
								canvas.width = width;
								canvas.height = height;

								const c = canvas.getContext("2d");

								c.fillStyle = await NodeRender.getNodeTypeFillStyle(c, await this.nodeRef.getType());

								for(const part of toRender) {
									const point = part.point.subtract(offset);
									c.beginPath();
									c.arc(point.x, point.y, part.radius, 0, 2 * Math.PI, false);
									c.fill();
								}

								return canvas;
							};

							render.push({
								nodeRender: this,
								corner: topLeftCorner.add(offset),
								z: z,
								layerZ: layerZ,
								canvas: canvasFunction,
								width: width,
								height: height,
								focusTiles: focusTiles,
								parts: toRender,
								drawType: drawType,
							});

						}
					}
				}
			}

			this.renders[zoom] = render;
		}
		return render;
	}
}

export { NodeRender, tileSize };

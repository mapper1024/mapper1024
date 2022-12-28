import { Vector3, Line3 } from "./geometry.js";
import { images } from "./images/index.js";

const tileSize = 16;

const fillStyles = {};

class NodeRender {
	constructor(context, nodeRef) {
		this.context = context;
		this.nodeRef = nodeRef;
		this.renders = {};
	}

	static async getNodeTypeFillStyle(context, nodeType) {
		let fillStyle = fillStyles[nodeType.id];

		if(fillStyle === undefined) {
			const image = document.createElement("canvas");
			image.width = image.height = tileSize;

			const c = image.getContext("2d");

			const imageName = await nodeType.getImageName();
			if(imageName) {
				c.drawImage(await images[imageName].image, 0, 0);
			}

			fillStyles[nodeType.id] = fillStyle = context.createPattern(image, "repeat");
		}

		return fillStyle;
	}

	async getLayers(zoom) {
		let render = this.renders[zoom];
		if(render === undefined) {
			render = [];

			const drawType = (await this.nodeRef.getLayer()).getDrawType();
			const areaDrawType = drawType === "area";

			if(this.context.unitsToPixels(await this.nodeRef.getRadius()) >= 1) {
				if(areaDrawType) {
					render = this.renderArea();
				}
				else {
					render = this.renderBorder();
				}
			}

			this.renders[zoom] = render;
		}
		return render;
	}

	async renderBorder() {
		const render = [];
		const toRender = [];

		let topLeftCorner = new Vector3(Infinity, Infinity, Infinity);
		let bottomRightCorner = new Vector3(-Infinity, -Infinity, -Infinity);

		for await (const childNodeRef of this.nodeRef.getChildren()) {
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

		const lines = [];

		for(const part of toRender) {
			part.point = part.absolutePoint.subtract(topLeftCorner);
		}

		for(const part of toRender) {
			const pointAt = r => (new Vector3(Math.cos(r), Math.sin(r), 0)).multiplyScalar(part.radius).add(part.point);
			const connect = (previous, next) => {
				const line = new Line3(previous, next);

				for(const otherPart of toRender) {
					if(otherPart === part) {
						continue;
					}

					let aIn;
					let bIn;

					do {
						aIn = otherPart.point.subtract(line.a).length() < otherPart.radius - 1;
						bIn = otherPart.point.subtract(line.b).length() < otherPart.radius - 1;

						if(aIn && bIn) {
							return;
						}

						if(aIn) {
							line.a = line.a.add(line.b).divideScalar(2);
						}
						else if(bIn) {
							line.b = line.a.add(line.b).divideScalar(2);
						}
					} while(aIn || bIn);
				}

				lines.push({
					line: line.map(v => v.map(c => Math.floor(c + 0.5))),
					part: part,
				});
			};

			let previousPoint = pointAt(0);

			const increment = 8 / part.radius;

			for(let r = increment; r < Math.PI * 2; r += increment) {
				const currentPoint = pointAt(r);
				connect(previousPoint, currentPoint);
				previousPoint = currentPoint;
			}

			connect(previousPoint, pointAt(0));
		}

		const miniCanvasSize = 2048;
		const totalCanvasSize = new Vector3(bottomRightCorner.x - topLeftCorner.x, bottomRightCorner.y - topLeftCorner.y, 0);

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

					c.strokeStyle = (await this.nodeRef.getType()).getColor();

					for(const line of lines) {
						const a = line.line.a.subtract(offset);
						const b = line.line.b.subtract(offset);
						c.beginPath();
						c.moveTo(a.x, a.y);
						c.lineTo(b.x, b.y);
						c.stroke();
					}

					return canvas;
				};

				render.push({
					nodeRender: this,
					corner: topLeftCorner.add(offset),
					z: 0,
					canvas: canvasFunction,
					width: width,
					height: height,
					focusTiles: {},
					parts: toRender,
				});
			}
		}

		return render;
	}

	async renderArea() {
		const render = [];

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

			const focusTileEliminationDistance = tileSize * 2;

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
						canvas: canvasFunction,
						width: width,
						height: height,
						focusTiles: focusTiles,
						parts: toRender,
					});
				}
			}
		}

		return render;
	}
}

export { NodeRender, tileSize };

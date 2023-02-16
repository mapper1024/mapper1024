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

	static async getNodeTypeFillStyle(context, nodeType, backgroundType) {
		const id = nodeType.id + ":" + (backgroundType ? backgroundType.id : "");
		let fillStyle = fillStyles[id];

		if(fillStyle === undefined) {
			const tiles = await nodeType.getAllTiles();
			const conglomerateTileSize = Math.max(tileSize, tileSize * tiles.length);

			const image = document.createElement("canvas");
			image.width = image.height = conglomerateTileSize;

			const c = image.getContext("2d");

			if(backgroundType) {
				c.fillStyle = backgroundType.getColor();
			}
			else {
				c.fillStyle = nodeType.getColor();
			}

			c.fillRect(0, 0, conglomerateTileSize, conglomerateTileSize);

			if(tiles.length > 0) {
				for(let x = 0; x < conglomerateTileSize; x += tileSize) {
					for(let y = 0; y < conglomerateTileSize; y += tileSize) {
						c.drawImage(await images[tiles[Math.floor(Math.random() * tiles.length)]].image, x, y, tileSize, tileSize);
					}
				}
			}

			fillStyles[id] = fillStyle = context.createPattern(image, "repeat");
		}

		return fillStyle;
	}

	static async drawExplicitNode(context, nodeType, x, y, radius) {
		const imageName = await nodeType.getImageName();
		if(imageName) {
			const image = await images[imageName].image;
			context.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
		}
		else {
			context.fillStyle = nodeType.getColor();

			context.beginPath();
			context.arc(x, y, radius, 0, 2 * Math.PI, false);
			context.fill();
		}
	}

	static async drawThumbnailRadius(context, nodeType, x, y, radius) {
		return NodeRender.drawThumbnailRect(context, nodeType, x - radius, y - radius, radius * 2, radius * 2);
	}

	static async drawThumbnailRect(context, nodeType, x, y, width, height) {
		if(nodeType.getScale() === "explicit") {
			const radius = Math.ceil(Math.min(width, height) / 2);
			await NodeRender.drawExplicitNode(context, nodeType, x + radius, y + radius, radius);
		}
		else {
			for(const fillStyle of [nodeType.getColor(), await NodeRender.getNodeTypeFillStyle(context, nodeType)]) {
				context.fillStyle = fillStyle;
				context.fillRect(x, y, width, height);
			}
		}
	}

	async getLayers(zoom) {
		let render = this.renders[zoom];
		if(render === undefined) {
			render = [];

			if(this.context.unitsToPixels(await this.nodeRef.getRadius()) >= 1) {
				const nodeLayer = await this.nodeRef.getLayer();
				const drawType = nodeLayer.getDrawType();

				if(drawType === "area") {
					const nodeType = await this.nodeRef.getType();

					if(nodeType.getScale() === "terrain") {
						render = this.renderTerrain();
					}
					else {
						render = this.renderExplicit();
					}
				}
				else {
					render = this.renderBorder();
				}
			}

			this.renders[zoom] = render;
		}
		return render;
	}

	async renderExplicit() {
		const render = [];

		const nodeType = await this.nodeRef.getType();

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

			for(const childNodeRef of children) {
				const minumumPixelRadius = tileSize;
				const radiusInPixels = Math.max(this.context.unitsToPixels(await childNodeRef.getRadius()), minumumPixelRadius);
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
			}

			const miniCanvasSize = 1024;
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

						for(const part of toRender) {
							const point = part.point.subtract(offset);
							await NodeRender.drawExplicitNode(c, nodeType, point.x, point.y, part.radius);
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
						focusTiles: {},
						parts: toRender,
					});
				}
			}
		}

		return render;
	}

	async renderBorder() {
		const render = [];
		const toRender = [];

		const nodeType = await this.nodeRef.getType();

		let topLeftCorner = new Vector3(Infinity, Infinity, Infinity);
		let bottomRightCorner = new Vector3(-Infinity, -Infinity, -Infinity);

		const nodeIdsToPart = {};

		for await (const childNodeRef of this.nodeRef.getChildren()) {
			const radiusInPixels = this.context.unitsToPixels(await childNodeRef.getRadius());
			const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels).noZ();
			const point = (await childNodeRef.getEffectiveCenter()).map((c) => this.context.unitsToPixels(c)).noZ();

			topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
			bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

			const part = {
				nodeRef: childNodeRef,
				layer: await childNodeRef.getLayer(),
				absolutePoint: point,
				radius: radiusInPixels,
			};

			toRender.push(part);

			nodeIdsToPart[part.nodeRef.id] = part;
		}

		// Align the node render to the tile grid.
		topLeftCorner = topLeftCorner.map(Math.floor).map((c) => c - c % tileSize);
		bottomRightCorner = bottomRightCorner.map(Math.ceil);

		const lines = [];

		for(const part of toRender) {
			part.point = part.absolutePoint.subtract(topLeftCorner);
		}

		if(nodeType.isPath()) {
			const foundEdges = new Set();

			for(const part of toRender) {
				if(await part.nodeRef.getNodeType() === "path") {
					for await (const dirEdgeRef of part.nodeRef.getEdges()) {
						const otherNodeRef = await dirEdgeRef.getDirOtherNode();
						const k = part.nodeRef.id < otherNodeRef.id ? (part.nodeRef.id + "," + otherNodeRef.id) : (otherNodeRef.id + "," + part.nodeRef.id);
						if(!foundEdges.has(k)) {
							foundEdges.add(k);

							const otherPart = nodeIdsToPart[otherNodeRef.id];

							lines.push(new Line3(part.point, otherPart.point));
						}
					}
				}
			}
		}
		else {

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

					lines.push(line.map(v => v.map(c => Math.floor(c + 0.5))));
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
						const a = line.a.subtract(offset);
						const b = line.b.subtract(offset);
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

	async renderTerrain() {
		const fakeCanvas = document.createElement("canvas");
		fakeCanvas.width = tileSize;
		fakeCanvas.height = tileSize;

		const fakeContext = fakeCanvas.getContext("2d");

		const nodeType = await this.nodeRef.getType();
		const nodeLayer = await this.nodeRef.getLayer();

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

		const receivesBackground = (await this.nodeRef.getType()).receivesBackground();

		for(const z in layers) {
			const children = layers[z];
			const toRender = [];

			let topLeftCorner = new Vector3(Infinity, Infinity, Infinity);
			let bottomRightCorner = new Vector3(-Infinity, -Infinity, -Infinity);

			const focusTiles = {};

			const nodeIdsToPart = {};

			for(const childNodeRef of children) {
				const radiusInPixels = this.context.unitsToPixels(await childNodeRef.getRadius());

				if(radiusInPixels < 1) {
					continue;
				}

				const radiusVector = Vector3.UNIT.multiplyScalar(radiusInPixels).noZ();
				const point = (await childNodeRef.getEffectiveCenter()).map((c) => this.context.unitsToPixels(c)).noZ();

				topLeftCorner = Vector3.min(topLeftCorner, point.subtract(radiusVector));
				bottomRightCorner = Vector3.max(bottomRightCorner, point.add(radiusVector));

				const backgroundNodeRef = receivesBackground ? await this.context.getBackgroundNode(childNodeRef) : null;

				let fillStyle;

				if(backgroundNodeRef) {
					fillStyle = await NodeRender.getNodeTypeFillStyle(fakeContext, await this.nodeRef.getType(), await backgroundNodeRef.getType());
				}
				else {
					fillStyle = await NodeRender.getNodeTypeFillStyle(fakeContext, await this.nodeRef.getType());
				}

				const part = {
					nodeRef: childNodeRef,
					backgroundNodeRef: backgroundNodeRef,
					fillStyle: fillStyle,
					layer: await childNodeRef.getLayer(),
					absolutePoint: point,
					radius: radiusInPixels,
				};

				toRender.push(part);

				nodeIdsToPart[part.nodeRef.id] = part;
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

					let tile = tilesX[tilePos.y];
					if(tile === undefined) {
						tile = tilesX[tilePos.y] = {
							absolutePoint: absolutePoint,
							centerPoint: absolutePoint.add(new Vector3(tileSize / 2, tileSize / 2, 0)),
							layer: nodeLayer,
							fillStyles: new Set(),
						};

						tile.fillStyles.add(part.fillStyle);
					}
				}
			}

			const lines = [];

			if(nodeType.isPath()) {
				const foundEdges = new Set();

				for(const part of toRender) {
					if(await part.nodeRef.getNodeType() === "path") {
						for await (const dirEdgeRef of part.nodeRef.getEdges()) {
							const otherNodeRef = await dirEdgeRef.getDirOtherNode();
							const k = part.nodeRef.id < otherNodeRef.id ? (part.nodeRef.id + "," + otherNodeRef.id) : (otherNodeRef.id + "," + part.nodeRef.id);
							if(!foundEdges.has(k)) {
								foundEdges.add(k);

								const otherPart = nodeIdsToPart[otherNodeRef.id];
								if(otherPart) {
									lines.push(new Line3(part.point, otherPart.point));
								}
							}
						}
					}
				}
			}

			const focusTileEliminationDistance = tileSize;

			/* Loop through all focus tiles and delete those that fall fully within another part;
			* they would certainly not be borders. */
			for(const tX in focusTiles) {
				const focusTilesX = focusTiles[tX];
				for(const tY in focusTilesX) {
					const tile = focusTilesX[tY];
					const point = tile.centerPoint;
					if(tile.fillStyles.size > 1) {
						continue;
					}
					for(const part of toRender) {
						if(!tile.fillStyles.has(part.fillStyle)) {
							break;
						}
						if(part.absolutePoint.subtract(point).length() <= part.radius - focusTileEliminationDistance) {
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

					if(toRender.length > 0) {
						let canvas;

						const canvasFunction = async () => {
							if(canvas) {
								return canvas;
							}

							canvas = document.createElement("canvas");
							canvas.width = width;
							canvas.height = height;

							const c = canvas.getContext("2d");

							for(const part of toRender) {
								c.fillStyle = part.fillStyle;

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

					if(lines.length > 0) {
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
								const a = line.a.subtract(offset);
								const b = line.b.subtract(offset);
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
							z: z,
							zWait: true,
							canvas: canvasFunction,
							width: width,
							height: height,
							focusTiles: {},
							parts: [],
						});
					}
				}
			}
		}

		return render;
	}
}

export { NodeRender, tileSize };

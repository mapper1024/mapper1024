import { Vector3 } from "./geometry.js";
import { mod, weightedRandom } from "./utils.js";

const dirs = {};

dirs.N = new Vector3(0, -1, 0);
dirs.S = new Vector3(0, 1, 0);
dirs.W = new Vector3(-1, 0, 0);
dirs.E = new Vector3(1, 0, 0);

dirs.NW = dirs.N.add(dirs.W);
dirs.NE = dirs.N.add(dirs.E);
dirs.SW = dirs.S.add(dirs.W);
dirs.SE = dirs.S.add(dirs.E);

const dirKeys = Object.keys(dirs);

const normalizedDirs = {};

for(const dirName of dirKeys) {
	normalizedDirs[dirName] = dirs[dirName].normalize();
}

const colors = [
	"blue",
	"darkblue",
	"lightblue",
	"red",
	"maroon",
	"crimson",
	"orange",
	"darkorange",
	"purple",
	"violet",
	"indigo",
	"yellow",
	"goldenrod",
	"pink",
	"hotpink",
	"brown",
	"moccasin",
];

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.nearbyPoliticalNodeIds = new Set();
		this.nearbyAnnotationNodeIds = new Set();
		this.nearbyBorderMasterNodeIds = new Set();
		this.corner = corner;

		this.closestNodeRef = null;
		this.closestNodeType = null;
		this.closestNodeDistance = Infinity;
		this.closestNodeRadiusInUnits = Infinity;
		this.closestNodeAltitude = -Infinity;

		this.closestPoliticalNodeRef = null;
		this.closestPoliticalNodeDistance = Infinity;

		this.closestAnnotationNodeRef = null;
		this.closestAnnotationNodeDistance = Infinity;
	}

	getCenter() {
		return this.corner.add(Tile.HALF_SIZE_VECTOR);
	}

	getMegatileCenterPosition() {
		return this.getMegaTilePosition().add(Tile.HALF_SIZE_VECTOR);
	}

	getMegaTilePosition() {
		return this.corner.map((v) => mod(v, MegaTile.SIZE));
	}

	getTilePosition() {
		return this.corner.map((v) => Math.floor(v / Tile.SIZE));
	}

	async addNode(nodeRef) {
		const nodeLayer = await nodeRef.getLayer();
		const nodeLayerType = nodeLayer.getType();
		const nodeType = await nodeRef.getType();
		const isArea = nodeType.isArea();
		const nodeCenterInUnits = await nodeRef.getEffectiveCenter();
		const nodeCenterInPixels = this.context.mapPointToTileCanvas(nodeCenterInUnits);
		const distance = nodeCenterInPixels.subtract(this.getCenter()).length();
		const nodeRadiusInUnits = await nodeRef.getRadius();
		const nodeRadiusInPixels = this.context.unitsToPixels(nodeRadiusInUnits);
		const fits = distance <= nodeRadiusInPixels + Tile.SIZE / 2 && nodeRadiusInPixels >= 1;
		if(fits) {
			this.megaTile.addNode(nodeRef.id);

			if(nodeLayerType === "geographical") {
				this.nearbyNodes.set(nodeRef.id, nodeRef);

				if(distance < this.closestNodeDistance && (nodeCenterInUnits.z > this.closestNodeAltitude || (nodeCenterInUnits.z === this.closestNodeAltitude && nodeRadiusInUnits <= this.closestNodeRadiusInUnits))) {
					this.closestNodeRef = nodeRef;
					this.closestNodeRadiusInUnits = nodeRadiusInUnits;
					this.closestNodeAltitude = nodeCenterInUnits.z;
					this.closestNodeType = await nodeRef.getType();
				}

			}
			else if(nodeLayerType === "political") {
				if(distance < this.closestPoliticalNodeDistance) {
					this.closestPoliticalNodeRef = nodeRef;
					this.closestPoliticalNodeDistance = distance;
				}

				this.nearbyPoliticalNodeIds.add(nodeRef.id);
				const parent = await nodeRef.getParent();
				if(isArea && parent) {
					this.nearbyBorderMasterNodeIds.add(parent.id);
				}
			}
			else if(nodeLayerType === "annotation") {
				if(distance < this.closestAnnotationNodeDistance) {
					this.closestAnnotationNodeRef = nodeRef;
					this.closestAnnotationNodeDistance = distance;
				}

				this.nearbyAnnotationNodeIds.add(nodeRef.id);
				const parent = await nodeRef.getParent();
				if(isArea && parent) {
					this.nearbyBorderMasterNodeIds.add(parent.id);
				}
			}

			return true;
		}
		else {
			return false;
		}
	}

	* getNearbyNodes() {
		yield* this.nearbyNodes.values();
	}

	* getNeighborTiles() {
		const origin = this.getTilePosition();
		for(const dirName of dirKeys) {
			const dir = dirs[dirName];
			const otherTilePosition = origin.add(dir);
			const otherTileX = this.context.tiles[otherTilePosition.x];
			let otherTile;
			if(otherTileX) {
				otherTile = otherTileX[otherTilePosition.y];
			}
			yield [dirName, dir, otherTile];
		}
	}

	async render() {
		if(this.closestNodeType) {
			const position = this.getMegaTilePosition();

			const key = [this.closestNodeType.id, Math.floor(Math.random() * 4)];

			for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
				dirName;
				dir;
				const otherType = (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType.id : "null";
				key.push(otherType);
			}

			const keyString = key.join(" ");
			const tileRenders = this.context.tileRenders;
			let canvas = tileRenders[keyString];

			if(canvas === undefined) {
				canvas = document.createElement("canvas");
				canvas.width = Tile.SIZE;
				canvas.height = Tile.SIZE;

				const neighbors = {};
				for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
					neighbors[dirName] = {
						dir: dir,
						type: (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType : null,
					};
				}

				await Tile.renderMasterGeographical(canvas, this.closestNodeType, neighbors);
				tileRenders[keyString] = canvas;
			}

			this.megaTile.canvasContext.drawImage(canvas, position.x, position.y);
		}

		if(this.nearbyBorderMasterNodeIds.size > 0) {
			let totalTiles = 0;
			const found = new Map();
			for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
				totalTiles++;
				dirName;
				dir;
				if(otherTile) {
					for(const nodeId of otherTile.nearbyBorderMasterNodeIds) {
						found.set(nodeId, found.has(nodeId) ? found.get(nodeId) + 1 : 1);
					}
				}
			}

			const position = this.getMegaTilePosition();
			const c = this.megaTile.canvasContext;

			const actualNodeIds = [];
			for(const nodeId of this.nearbyBorderMasterNodeIds) {
				if(!found.has(nodeId) || found.get(nodeId) < totalTiles) {
					actualNodeIds.push(nodeId);
				}
			}

			if(actualNodeIds.length > 0) {
				c.fillStyle = "white";
				c.beginPath();
				c.arc(position.x + Tile.SIZE / 2, position.y + Tile.SIZE / 2, Tile.SIZE / 8 + 2, 0, Math.PI * 2, false);
				c.fill();
			}

			const radiansPerNode = Math.PI * 2 / actualNodeIds.length;

			let i = 0;
			for(const nodeId of actualNodeIds) {
				const colorI = nodeId % colors.length;
				c.fillStyle = colors[colorI];

				c.beginPath();
				c.arc(position.x + Tile.SIZE / 2, position.y + Tile.SIZE / 2, Tile.SIZE / 8, radiansPerNode * i, radiansPerNode * (i + 1), false);
				c.fill();

				i++;
			}
		}
	}

	static async renderMasterGeographical(canvas, type, neighbors) {
		const c = canvas.getContext("2d");

		const colors = {
			grass: ["green", "forestgreen", "mediumseagreen", "seagreen"],
			water: ["deepskyblue", "darkblue", "seagreen"],
			forest: ["darkgreen", "forestgreen", "darkseagreen", "olivedrab"],
			rocks: ["slategray", "black", "gray", "lightslategray", "darkgray"],
			road: ["brown", "darkgoldenrod", "olive", "tan", "wheat", "sandybrown"],
			buildings: ["yellow", "sandybrown", "darkgoldenrod", "gold", "orange"],
			null: ["black", "darkgray", "darkseagreen"],
		};

		const pixelSizes = {
			grass: 1,
			water: 1,
			forest: 2,
			rocks: 2,
		};

		function getTypeColors(type) {
			const acolors = colors[type.id];
			return acolors || [type.getColor()];
		}

		function getOurColors() {
			return getTypeColors(type);
		}

		function weight(pxv, v) {
			const l = v.subtract(pxv).length();
			const w = l === 0 ? Infinity: 1 / l;
			return w;
		}

		const pixelSize = pixelSizes[type.id] || 2;
		const ourColors = getOurColors();

		for(let x = 0; x < canvas.width; x += pixelSize) {
			for(let y = 0; y < canvas.height; y += pixelSize) {
				const pxv = (new Vector3(x, y, 0)).subtract(Tile.HALF_SIZE_VECTOR).divideScalar(Tile.SIZE);

				const neighborColors = [[ourColors, weight(pxv, Vector3.ZERO)]];

				for(const dirName of dirKeys) {
					const neighborType = neighbors[dirName].type;
					neighborColors.push([neighborType ? getTypeColors(neighborType) : colors["null"], weight(pxv, normalizedDirs[dirName])]);
				}

				const ucolors = weightedRandom(neighborColors);

				c.fillStyle = ucolors[Math.floor(Math.random() * ucolors.length)];
				c.fillRect(x, y, pixelSize, pixelSize);
			}
		}
	}
}

Tile.SIZE = 16;
Tile.HALF_SIZE_VECTOR = new Vector3(Tile.SIZE / 2, Tile.SIZE / 2, 0);

class MegaTile {
	constructor(context, point) {
		this.point = point;
		this.context = context;
		this.nearbyNodeIds = new Set();
		this.needRedraw = new Set();
		this.clean = true;

		this.canvas = document.createElement("canvas");
		this.canvas.width = MegaTile.SIZE;
		this.canvas.height = MegaTile.SIZE;
		this.canvasContext = this.canvas.getContext("2d");
	}

	makeTile(point) {
		return new Tile(this, point);
	}

	reset() {
		if(!this.clean) {
			this.clean = true;
			for(const nodeId of this.nearbyNodeIds) {
				this.needRedraw.add(nodeId);
			}
			const c = this.canvas.getContext("2d");
			c.beginPath();
			c.rect(0, 0, this.canvas.width, this.canvas.height);
			c.fillStyle = this.context.backgroundColor;
			c.fill();
		}
	}

	addNode(nodeId) {
		this.nearbyNodeIds.add(nodeId);
		this.clean = false;
	}

	removeNode(nodeId) {
		this.nearbyNodeIds.delete(nodeId);
		this.reset();
	}

	popRedraw() {
		const needRedraw = this.needRedraw;
		this.needRedraw = new Set();
		return needRedraw;
	}
}

MegaTile.SIZE = Tile.SIZE * 8;

export { Tile, MegaTile };

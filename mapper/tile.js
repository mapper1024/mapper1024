import { Vector3 } from "./geometry.js";
import { mod } from "./utils.js";

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

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.corner = corner;

		this.closestNodeRef = null;
		this.closestNodeType = null;
		this.closestNodeDistance = Infinity;
		this.closestNodeRadiusInUnits = Infinity;
		this.closestNodeAltitude = -Infinity;
		this.closestNodeIsOverpowering = false;
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
		const nodeCenterInUnits = await nodeRef.getEffectiveCenter();
		const nodeCenterInPixels = nodeCenterInUnits.map((a) => this.context.unitsToPixels(a));
		const distance = nodeCenterInPixels.subtract(this.getCenter()).length();
		const nodeRadiusInUnits = await nodeRef.getRadius();
		const nodeRadiusInPixels = this.context.unitsToPixels(nodeRadiusInUnits);
		if(distance <= nodeRadiusInPixels + Tile.SIZE / 2 && nodeRadiusInPixels >= Tile.SIZE / 8) {
			this.nearbyNodes.set(nodeRef.id, nodeRef);
			this.megaTile.addNode(nodeRef.id);

			if(distance < this.closestNodeDistance && (nodeCenterInUnits.z > this.closestNodeAltitude || (nodeCenterInUnits.z === this.closestNodeAltitude && nodeRadiusInUnits <= this.closestNodeRadiusInUnits))) {
				this.closestNodeRef = nodeRef;
				this.closestNodeRadiusInUnits = nodeRadiusInUnits;
				this.closestNodeAltitude = nodeCenterInUnits.z;
				this.closestNodeType = await nodeRef.getType();
				this.closestNodeIsOverpowering = distance < nodeRadiusInPixels - Tile.SIZE / 2;
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
		const position = this.getMegaTilePosition();

		const key = [this.closestNodeType.id];

		if(!this.closestNodeIsOverpowering) {
			for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
				dirName;
				dir;
				const otherType = (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType.id : "null";
				key.push(otherType);
			}
		}

		const keyString = key.join(" ");
		const tileRenders = this.context.tileRenders;
		let canvas = tileRenders[keyString];

		if(canvas === undefined) {
			canvas = document.createElement("canvas");
			canvas.width = Tile.SIZE;
			canvas.height = Tile.SIZE;

			let neighbors;

			if(!this.closestNodeIsOverpowering) {
				neighbors = {};

				for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
					neighbors[dirName] = {
						dir: dir,
						type: (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType : null,
					};
				}
			}

			await Tile.renderMaster(canvas, this.closestNodeType, neighbors);
			tileRenders[keyString] = canvas;
		}

		this.megaTile.canvasContext.drawImage(canvas, position.x, position.y);
	}

	static async renderMaster(canvas, type, neighbors) {
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
			return acolors || [type.def.color];
		}

		function getOurColors() {
			return getTypeColors(type);
		}

		const ourColors = getOurColors();
		const pixelSize = pixelSizes[type.id] || 2;
		const hasNeighbors = !!neighbors;

		for(let x = 0; x < canvas.width; x += pixelSize) {
			for(let y = 0; y < canvas.height; y += pixelSize) {
				let ucolors;

				if(hasNeighbors) {
					const pxv = (new Vector3(x, y, 0)).subtract(Tile.HALF_SIZE_VECTOR).divideScalar(Tile.SIZE);

					let neighborColors = ourColors;
					let closestDistance = Infinity;

					for(const dirName of dirKeys) {
						const distance = dirs[dirName].subtract(pxv).length();
						if(closestDistance > distance) {
							const neighborType = neighbors[dirName].type;
							neighborColors = neighborType ? getTypeColors(neighborType) : colors["null"];
							closestDistance = distance;
						}
					}

					ucolors = Math.random() < closestDistance ? ourColors : neighborColors;
				}
				else {
					ucolors = ourColors;
				}

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

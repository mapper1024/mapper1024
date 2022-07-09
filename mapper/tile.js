import { Vector3 } from "./geometry.js";
import { mod } from "./utils.js";

const dirs = {};

dirs.N = new Vector3(0, -1, 0);
dirs.S = new Vector3(0, 1, 0);
dirs.W = new Vector3(-1, 0, );
dirs.E = new Vector3(1, 0, 0);

dirs.NW = dirs.N.add(dirs.W);
dirs.NE = dirs.N.add(dirs.E);
dirs.SW = dirs.S.add(dirs.W);
dirs.SE = dirs.S.add(dirs.E);

const tileRenders = {};

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.corner = corner;

		this.closestNodeRef = null;
		this.closestNodeType = null;
		this.closestNodeDistance = Infinity;
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
		const nodeCenter = (await nodeRef.getCenter()).map((a) => this.context.unitsToPixels(a));
		const distance = nodeCenter.subtract(this.getCenter()).length();
		const nodeRadius = this.context.unitsToPixels(await nodeRef.getRadius());
		if(distance <= nodeRadius + Tile.SIZE / 2) {
			this.nearbyNodes.set(nodeRef.id, nodeRef);
			this.megaTile.addNode(nodeRef.id);

			if(distance < this.closestNodeDistance) {
				this.closestNodeRef = nodeRef;
				this.closestNodeType = await nodeRef.getType();
				this.closestNodeIsOverpowering = distance < nodeRadius - Tile.SIZE / 2;
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
		for(const dirName in dirs) {
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

		if(tileRenders[keyString] === undefined) {
			const canvas = document.createElement("canvas");
			canvas.width = Tile.SIZE;
			canvas.height = Tile.SIZE;

			const neighbors = {};

			for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
				neighbors[dirName] = {
					dir: dir,
					type: (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType : null,
				};
			}

			await Tile.renderMaster(canvas, this.closestNodeType, neighbors);
			tileRenders[keyString] = canvas;
		}

		const megaTileContext = this.megaTile.canvas.getContext("2d");
		megaTileContext.drawImage(tileRenders[keyString], position.x, position.y);
	}

	static async renderMaster(canvas, type, neighbors) {
		neighbors;
		const c = canvas.getContext("2d");

		function fillRandomPixels(colors, pixelSize) {
			for(let x = 0; x < canvas.width; x += pixelSize) {
				for(let y = 0; y < canvas.height; y += pixelSize) {
					c.fillStyle = colors[Math.floor(Math.random() * colors.length)];
					c.fillRect(x, y, pixelSize, pixelSize);
				}
			}
		}

		if(type.id === "grass") {
			fillRandomPixels(["green", "forestgreen", "mediumseagreen", "seagreen"], 1);
		}
		else if(type.id === "water") {
			fillRandomPixels(["blue", "skyblue", "aqua", "deepskyblue"], 1);
		}
		else if(type.id === "forest") {
			fillRandomPixels(["darkgreen", "forestgreen", "darkseagreen", "olivedrab"], 2);
		}
		else if(type.id === "rocks") {
			fillRandomPixels(["slategray", "black", "gray", "lightslategray", "darkgray"], 2);
		}
		else {
			c.fillStyle = type.def.color;
			c.fillRect(0, 0, Tile.SIZE, Tile.SIZE);
		}
	}
}

Tile.SIZE = 32;
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

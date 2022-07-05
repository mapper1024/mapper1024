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

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.corner = corner;

		this.closestNodeRef = null;
		this.closestNodeType = null;
		this.closestNodeDistance = Infinity;
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
		const distance = (await nodeRef.getCenter()).subtract(this.getCenter()).length();
		if(distance <= (await nodeRef.getRadius()) + Tile.SIZE / 2) {
			this.nearbyNodes.set(nodeRef.id, nodeRef);
			this.megaTile.addNode(nodeRef.id);

			if(distance < this.closestNodeDistance) {
				this.closestNodeRef = nodeRef;
				this.closestNodeType = await nodeRef.getType();
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
		const centerPosition = this.getMegatileCenterPosition();
		const c = this.megaTile.canvas.getContext("2d");
		c.fillStyle = this.closestNodeType.def.color;
		c.fillRect(position.x, position.y, Tile.SIZE, Tile.SIZE);

		for(const [dirName, dir, otherTile] of this.getNeighborTiles()) {
			const p = centerPosition.add(dir.multiplyScalar(Tile.SIZE / 4));
			c.fillStyle = (otherTile && otherTile.closestNodeType) ? otherTile.closestNodeType.def.color : "black";
			c.fillRect(p.x - 4, p.y - 4, 8, 8);
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

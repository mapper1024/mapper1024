import { Vector3 } from "./geometry.js";
import { mod } from "./utils.js";

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.corner = corner;
	}

	getCenter() {
		return this.corner.add(Tile.HALF_SIZE_VECTOR);
	}

	getMegaTilePosition() {
		return this.corner.map((v) => mod(v, MegaTile.SIZE));
	}

	async addNode(nodeRef) {
		const distance = (await nodeRef.getCenter()).subtract(this.getCenter()).length();
		if(distance <= (await nodeRef.getRadius()) + Tile.SIZE / 2) {
			this.nearbyNodes.set(nodeRef.id, nodeRef);
			this.megaTile.addNode(nodeRef.id);
			return true;
		}
		else {
			return false;
		}
	}

	* getNearbyNodes() {
		yield* this.nearbyNodes.values();
	}

	async render() {
		const position = this.getMegaTilePosition();
		const c = this.megaTile.canvas.getContext("2d");
		c.fillStyle = this.nearbyNodes.size > 1 ? "red" : "blue";
		c.fillRect(position.x, position.y, Tile.SIZE, Tile.SIZE);
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

import { Vector3 } from "./geometry.js";
import { mod } from "./utils.js";

class Tile {
	constructor(megaTile, corner) {
		this.context = megaTile.context;
		this.megaTile = megaTile;
		this.nearbyNodes = new Map();
		this.corner = corner;

		this.corners = {}

		for(const corner in Tile.CORNERS) {
			const c = Tile.CORNERS[corner];
			this.corners[corner] = {
				point: this.corner.add(c.offset),
				closestNodeRef: null,
				closestDistance: Infinity,
			}
		}
	}

	getCenter() {
		return this.corner.add(Tile.HALF_SIZE_VECTOR);
	}

	getMegaTilePosition() {
		return this.corner.map((v) => mod(v, MegaTile.SIZE));
	}

	async addNode(nodeRef) {
		const nodeCenter = await nodeRef.getCenter();
		const distanceToCenter = nodeCenter.subtract(this.getCenter()).length();
		if(distanceToCenter <= (await nodeRef.getRadius()) + Tile.SIZE / 2) {
			this.nearbyNodes.set(nodeRef.id, {
				distance: distanceToCenter,
				nodeRef: nodeRef,
			});
			this.megaTile.addNode(nodeRef.id);

			for(const corner in this.corners) {
				const c = this.corners[corner];
				const distanceToCorner = (corner === "center") ? distanceToCenter : nodeCenter.subtract(c.point).length();
				if(distanceToCorner < c.closestDistance) {
					c.closestDistance = distanceToCorner;
					c.closestNodeRef = nodeRef;
				}
			}

			return true;
		}
		else {
			return false;
		}
	}

	* getNearbyNodes() {
		for(const nearby of this.nearbyNodes.values()) {
			yield nearby.nodeRef;
		}
	}

	async render() {
		const position = this.getMegaTilePosition();
		const context = this.megaTile.canvas.getContext("2d");
		const center = this.getCenter();
		for(const corner in this.corners) {
			const c = this.corners[corner];
			const ct = Tile.CORNERS[corner];
			context.fillStyle = (await c.closestNodeRef.getType()).def.color.toCSS();
			if(ct.dir) {
				const offsetPosition = position.add(ct.offset);
				context.beginPath();
				context.moveTo(offsetPosition.x, offsetPosition.y);
				context.lineTo(offsetPosition.x + Tile.SIZE * ct.dir.x, offsetPosition.y);
				context.lineTo(offsetPosition.x, offsetPosition.y + Tile.SIZE * ct.dir.y);
				context.closePath();
				context.fill();
			}
			else {
				context.beginPath();
				context.moveTo(position.x + Tile.SIZE / 2, position.y);
				context.lineTo(position.x + Tile.SIZE, position.y + Tile.SIZE / 2);
				context.lineTo(position.x + Tile.SIZE / 2, position.y + Tile.SIZE);
				context.lineTo(position.x, position.y + Tile.SIZE / 2);
				context.closePath();
				context.fill();
			}
		}
	}
}

Tile.SIZE = 32;
Tile.HALF_SIZE_VECTOR = new Vector3(Tile.SIZE / 2, Tile.SIZE / 2, 0);
Tile.CORNERS = {
	center: {
		offset: Tile.HALF_SIZE_VECTOR,
		dir: null,
	},
	nw: {
		offset: Vector3.ZERO,
		dir: new Vector3(1, 1, 0),
	},
	ne: {
		offset: new Vector3(Tile.SIZE, 0, 0),
		dir: new Vector3(-1, 1, 0),
	},
	sw: {
		offset: new Vector3(0, Tile.SIZE, 0),
		dir: new Vector3(1, -1, 0),
	},
	se: {
		offset: new Vector3(Tile.SIZE, Tile.SIZE, 0),
		dir: new Vector3(-1, -1, 0),
	},
}

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

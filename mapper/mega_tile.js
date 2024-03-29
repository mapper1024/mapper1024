import { Vector3 } from "./geometry.js";

const megaTileSize = 512;

class MegaTile {
	constructor(context, oneUnitInPixels, tileCorner) {
		this.tileCorner = tileCorner;
		this.corner = tileCorner.multiplyScalar(megaTileSize);
		this.center = this.corner.add(new Vector3(megaTileSize, megaTileSize, 0));
		this.radius = megaTileSize * Math.sqrt(2);
		this.oneUnitInPixels = oneUnitInPixels;

		this.context = context;

		this.canvas = document.createElement("canvas");
		this.canvas.width = megaTileSize;
		this.canvas.height = megaTileSize;

		this.context = this.canvas.getContext("2d");

		this.nodeIds = new Set();
		this.parts = [];
		this.tileCenterNodeRefCache = {};

		this.tiles = {};
	}

	/**
	 * Get the node drawn at a specific absolute (canvas) point in the specified layer.
	 * @param absolutePoint {Vector3}
	 * @param layer {Layer}
	 * @returns {part|null}
	 */
	async getDrawnNodePartAtPoint(absolutePoint, layer) {
		// For each part in order of most recently rendered first
		for(let i = this.parts.length - 1; i >= 0; i--) {
			const part = this.parts[i];
			// If this part is of a matching layer
			if(layer.id === part.layer.id) {
				// And if this part contains the target point
				if(part.absolutePoint.subtract(absolutePoint).length() < part.radius) {
					// Return this part.
					return part;
				}
			}
		}
		return null;
	}

	/**
	 * Get the node drawn at a specific absolute (canvas) point in the specified layer.
	 * The absolute point must be snapped to the nearest tile center.
	 * This method is intended to be faster (more cacheable) than the more specific #getDrawnNodePartAtPoint
	 * @param tileCenterPoint {Vector3}
	 * @param layer {Layer}
	 * @returns {part|null}
	 */
	async getDrawnNodePartAtPointTileAligned(tileCenterPoint, layer) {
		let cache = this.tileCenterNodeRefCache[layer.id];
		if(cache === undefined) {
			cache = this.tileCenterNodeRefCache[layer.id] = {};
		}

		let cacheX = cache[tileCenterPoint.x];
		if(cacheX === undefined) {
			cacheX = cache[tileCenterPoint.x] = {};
		}

		let nodePart = cacheX[tileCenterPoint.y];
		if(nodePart === undefined) {
			nodePart = cacheX[tileCenterPoint.y] = this.getDrawnNodePartAtPoint(tileCenterPoint, layer);
		}
		return nodePart;
	}

	async addParts(parts) {
		for(const part of parts) {
			if(part.absolutePoint.subtract(this.center).length() <= part.radius + this.radius) {
				this.parts.push(part);
			}
		}
	}
}

export { megaTileSize, MegaTile };

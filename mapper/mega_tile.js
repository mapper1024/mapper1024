const megaTileSize = 256;

class MegaTile {
	constructor(context, oneUnitInPixels, tileCorner) {
		this.tileCorner = tileCorner;
		this.corner = tileCorner.multiplyScalar(megaTileSize);
		this.oneUnitInPixels = oneUnitInPixels;

		this.context = context;

		this.canvas = document.createElement("canvas");
		this.canvas.width = megaTileSize;
		this.canvas.height = megaTileSize;

		this.context = this.canvas.getContext("2d");

		this.nodeIds = new Set();
	}
}

export { megaTileSize, MegaTile };

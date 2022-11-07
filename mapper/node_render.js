class NodeRender {
	constructor(context, nodeRef) {
		this.context = context;
		this.nodeRef = nodeRef;
	}

	async getLayers() {
		const canvas = document.createElement("canvas");
		const c = canvas.getContext("2d");
		c.beginPath();
		c.rect(0, 0, 16, 16);
		c.fillStyle = "red";
		c.fill();
		return [
			{
				z: 0,
				canvas: canvas,
			},
		];
	}
}

export { NodeRender };

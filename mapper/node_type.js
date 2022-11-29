class NodeType {
	constructor(id, def) {
		this.id = id;
		this.def = def;
	}

	getDescription() {
		return this.id;
	}

	getColor() {
		return this.def.color || "black";
	}

	getImageName() {
		return this.def.image;
	}

	getLayer() {
		return this.def.layer || "geographical";
	}

	getScale() {
		return this.def.scale || "terrain";
	}

	isArea() {
		return (this.def.area === false) ? false : true;
	}

	isPath() {
		return !!this.def.path;
	}
}

class NodeTypeRegistry {
	constructor() {
		this.types = {};

		this.registerType(new NodeType("water", {
			color: "darkblue",
			image: "water",
		}));

		this.registerType(new NodeType("grass", {
			color: "lightgreen",
			image: "grass",
		}));

		this.registerType(new NodeType("forest", {
			color: "darkgreen",
			image: "forest",
		}));

		this.registerType(new NodeType("tree", {
			color: "darkgreen",
			scale: "explicit",
		}));

		this.registerType(new NodeType("rocks", {
			color: "gray",
			image: "rocks",
		}));

		this.registerType(new NodeType("stone", {
			color: "gray",
			scale: "explicit",
		}));

		this.registerType(new NodeType("road", {
			color: "brown",
			path: true,
		}));

		this.registerType(new NodeType("buildings", {
			color: "yellow",
		}));

		this.registerType(new NodeType("tower", {
			color: "yellow",
			scale: "explicit",
		}));

		this.registerType(new NodeType("region", {
			color: "orange",
			layer: "political",
		}));

		this.registerType(new NodeType("route", {
			color: "white",
			layer: "political",
			path: true,
			area: false,
		}));

		this.registerType(new NodeType("note", {
			color: "white",
			layer: "annotation",
		}));
	}

	registerType(nodeType) {
		this.types[nodeType.id] = nodeType;
	}

	* getTypes() {
		for(const k in this.types) {
			yield this.types[k];
		}
	}

	get(typeId) {
		return this.types[typeId];
	}
}

export { NodeType, NodeTypeRegistry };

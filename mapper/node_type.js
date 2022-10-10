class NodeType {
	constructor(id, def) {
		this.id = id;
		this.def = def;
	}

	getDescription() {
		return this.id;
	}
}

class NodeTypeRegistry {
	constructor() {
		this.types = {};

		this.registerType(new NodeType("water", {
			color: "darkblue",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("grass", {
			color: "lightgreen",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("forest", {
			color: "darkgreen",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("tree", {
			color: "darkgreen",
			layer: "geographical",
			scale: "explicit",
		}));

		this.registerType(new NodeType("rocks", {
			color: "gray",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("stone", {
			color: "gray",
			layer: "geographical",
			scale: "explicit",
		}));

		this.registerType(new NodeType("road", {
			color: "brown",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("buildings", {
			color: "yellow",
			layer: "geographical",
			scale: "terrain",
		}));

		this.registerType(new NodeType("tower", {
			color: "yellow",
			layer: "geographical",
			scale: "explicit",
		}));

		this.registerType(new NodeType("region", {
			color: "orange",
			layer: "political",
			scale: "terrain",
		}));

		this.registerType(new NodeType("note", {
			color: "white",
			layer: "annotation",
			scale: "terrain",
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

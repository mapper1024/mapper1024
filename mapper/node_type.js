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
		}));

		this.registerType(new NodeType("grass", {
			color: "lightgreen",
			layer: "geographical",
		}));

		this.registerType(new NodeType("forest", {
			color: "darkgreen",
			layer: "geographical",
		}));

		this.registerType(new NodeType("rocks", {
			color: "gray",
			layer: "geographical",
		}));

		this.registerType(new NodeType("road", {
			color: "brown",
			layer: "geographical",
		}));

		this.registerType(new NodeType("buildings", {
			color: "yellow",
			layer: "geographical",
		}));

		this.registerType(new NodeType("region", {
			color: "orange",
			layer: "political",
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

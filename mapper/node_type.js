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
		}));

		this.registerType(new NodeType("grass", {
			color: "lightgreen",
		}));

		this.registerType(new NodeType("forest", {
			color: "darkgreen",
		}));

		this.registerType(new NodeType("rocks", {
			color: "gray",
		}));

		this.registerType(new NodeType("road", {
			color: "brown",
		}));

		this.registerType(new NodeType("buildings", {
			color: "yellow",
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

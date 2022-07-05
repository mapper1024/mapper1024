import { Color } from "./color.js";

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
			color: Color.fromRGB(0, 0, 0.5),
		}));

		this.registerType(new NodeType("grass", {
			color: Color.fromRGB(0, 0.75, 0),
		}));

		this.registerType(new NodeType("forest", {
			color: Color.fromRGB(0, 0.5, 0),
		}));

		this.registerType(new NodeType("mountain", {
			color: Color.fromRGB(0.5, 0.5, 0.5),
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

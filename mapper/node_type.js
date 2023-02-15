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

	receivesBackground() {
		return !(this.def.receivesBackground === false) && !this.givesBackground() && this.getImageName();
	}

	/* Get whether the node has a background or not.
	 * Even if the node doesn't explicitly give a background, ot may have a background color defined but will try to inheirit another color if possible.
	 * However, if there is no other node in the area, a node that has a default background color can provide the background to other nodes on top of it.
	 * This behavior must be explicitly disabled for terrain nodes, and is disabled by default for explicit nodes.
	 * @returns {boolean}
	 */
	hasBackground() {
		return !(this.def.hasBackground === false) && !(this.def.hasBackground === undefined && this.getScale() === "explicit");
	}

	givesBackground() {
		return !!this.def.givesBackground;
	}

	getImageName() {
		return this.def.image;
	}

	getExtraTileNames() {
		return this.def.extraTiles || [];
	}

	getAllTiles() {
		const tiles = [];
		if(this.getImageName()) {
			tiles.push(this.getImageName());
		}
		tiles.push(...this.getExtraTileNames());
		return tiles;
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

	getParent() {
		if(this.def.parent) {
			const parent = this.registry.get(this.def.parent);
			return parent.getParent() || parent;
		}
		else {
			return undefined;
		}
	}

	* getChildren() {
		for(const nodeType of this.registry.getTypes()) {
			const parent = nodeType.getParent();
			if(parent && parent.id === this.id) {
				yield nodeType;
			}
		}
	}

	isParent() {
		for(const child of this.getChildren()) {
			child;
			return true;
		}

		return false;
	}
}

const palette = {
	watery: "#66c",
	grassy: "#8a3",
	forest: "#8a3",
	coldforest: "#8a3",
	sandy: "#fa6",
	stony: "#888",
	city: "#789",
};

class NodeTypeRegistry {
	constructor() {
		this.types = {};

		this.registerType(new NodeType("water", {
			color: palette.watery,
			image: "water",
			receivesBackground: false,
			hasBackground: false,
			extraTiles: ["water2"],
		}));

		this.registerType(new NodeType("grass", {
			color: palette.grassy,
			image: "grass",
			givesBackground: true,
			extraTiles: ["grass2"],
		}));

		this.registerType(new NodeType("thick vegetation", {
			color: palette.forest,
			image: "thick vegetation",
			parent: "grass",
			extraTiles: ["thick vegetation2", "thick vegetation3"],
		}));

		this.registerType(new NodeType("sand", {
			color: palette.sandy,
			image: "sand",
			givesBackground: true,
			extraTiles: ["sand2"],
		}));

		this.registerType(new NodeType("forest", {
			color: palette.forest,
			image: "forest",
			extraTiles: ["forest2", "forest3"],
		}));

		this.registerType(new NodeType("cold forest", {
			color: palette.coldforest,
			image: "cold forest",
			parent: "forest",
			extraTiles: ["cold forest2", "cold forest3"],
		}));

		this.registerType(new NodeType("tree", {
			color: palette.forest,
			scale: "explicit",
			image: "tree",
			parent: "forest",
		}));

		this.registerType(new NodeType("rocks", {
			color: palette.stony,
			image: "rocks",
			extraTiles: ["rocks2", "rocks3", "rocks4"],
		}));

		this.registerType(new NodeType("stone", {
			color: palette.stony,
			scale: "explicit",
			image: "stone",
			parent: "rocks",
		}));

		this.registerType(new NodeType("road", {
			color: palette.sandy,
			image: "road",
			path: true,
		}));

		this.registerType(new NodeType("cobble", {
			color: palette.stony,
			image: "cobble",
			givesBackground: true,
		}));

		this.registerType(new NodeType("buildings", {
			color: palette.city,
			image: "buildings",
		}));

		this.registerType(new NodeType("tower", {
			color: palette.city,
			scale: "explicit",
			image: "tower",
			parent: "buildings",
		}));

		this.registerType(new NodeType("house", {
			color: palette.city,
			scale: "explicit",
			image: "house",
			parent: "buildings",
		}));

		this.registerType(new NodeType("castle", {
			color: palette.city,
			scale: "explicit",
			image: "castle",
			parent: "buildings",
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
		nodeType.registry = this;
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

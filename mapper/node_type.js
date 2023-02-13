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

class NodeTypeRegistry {
	constructor() {
		this.types = {};

		this.registerType(new NodeType("water", {
			color: "darkblue",
			image: "water",
			receivesBackground: false,
			hasBackground: false,
		}));

		this.registerType(new NodeType("grass", {
			color: "green",
			image: "grass",
			givesBackground: true,
		}));

		this.registerType(new NodeType("thick vegetation", {
			color: "green",
			image: "thick vegetation",
			parent: "grass",
		}));

		this.registerType(new NodeType("sand", {
			color: "sandybrown",
			image: "sand",
			givesBackground: true,
		}));

		this.registerType(new NodeType("forest", {
			color: "green",
			image: "forest",
			extraTiles: ["forest2", "forest3"],
		}));

		this.registerType(new NodeType("cold forest", {
			color: "green",
			image: "cold forest",
			parent: "forest",
		}));

		this.registerType(new NodeType("tree", {
			color: "darkgreen",
			scale: "explicit",
			image: "tree",
			parent: "forest",
		}));

		this.registerType(new NodeType("rocks", {
			color: "gray",
			image: "rocks",
			extraTiles: ["rocks2", "rocks3"],
		}));

		this.registerType(new NodeType("stone", {
			color: "gray",
			scale: "explicit",
			image: "stone",
			parent: "rocks",
		}));

		this.registerType(new NodeType("road", {
			color: "sandybrown",
			image: "road",
			path: true,
		}));

		this.registerType(new NodeType("buildings", {
			color: "slategray",
			image: "buildings",
		}));

		this.registerType(new NodeType("tower", {
			color: "yellow",
			scale: "explicit",
			image: "tower",
			parent: "buildings",
		}));

		this.registerType(new NodeType("house", {
			color: "yellow",
			scale: "explicit",
			image: "house",
			parent: "buildings",
		}));

		this.registerType(new NodeType("castle", {
			color: "yellow",
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

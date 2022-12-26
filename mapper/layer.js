class Layer {
	constructor(id, def) {
		this.id = id;
		this.def = def;
	}

	getDescription() {
		return this.id;
	}

	getType() {
		return this.def.type;
	}

	getDrawType() {
		return this.getType() === "geographical" ? "area" : "border";
	}

	getZ() {
		return this.def.z ? this.def.z : 0;
	}
}

class LayerRegistry {
	constructor() {
		this.layers = {};

		this.registerLayer(new Layer("geographical", {
			type: "geographical",
			z: 0,
		}));

		this.registerLayer(new Layer("political", {
			type: "political",
			z: 10,
		}));

		this.registerLayer(new Layer("annotation", {
			type: "annotation",
			z: 15,
		}));
	}

	registerLayer(layer) {
		this.layers[layer.id] = layer;
	}

	* getLayers() {
		for(const k in this.layers) {
			yield this.layers[k];
		}
	}

	get(id) {
		return this.layers[id];
	}

	getDefault() {
		return this.get("geographical");
	}
}

export { Layer, LayerRegistry };


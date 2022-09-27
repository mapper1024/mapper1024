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
}

class LayerRegistry {
	constructor() {
		this.layers = {};

		this.registerLayer(new Layer("geographical", {
			type: "geographical",
		}));

		this.registerLayer(new Layer("political", {
			type: "political"
		}));

		this.registerLayer(new Layer("annotation", {
			type: "annotation",
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


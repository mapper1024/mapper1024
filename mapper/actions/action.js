class Action {
	constructor(context, options) {
		this.context = context;
		this.options = options;
	}

	empty() {
		return true;
	}

	async perform() {}
}

export { Action };

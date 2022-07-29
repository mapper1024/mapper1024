/** An Action performed on the map (such as adding a node or changing a node's property).
 * Every action has an opposite action that can be used to create an undo/redo system.
 */
class Action {
	/**
	 * @param context {RenderContext} the context in which this action is performed
	 * @param options A key-value object of various options for the action.
	 */
	constructor(context, options) {
		this.context = context;
		this.options = options;
	}

	/**
	 * Is the action a no-op, based on its options?
	 * @returns {boolean}
	 */
	empty() {
		return false;
	}

	/** Perform the action.
	 * @return {Action} An action that completely undoes the performed action.
	 */
	async perform() {}
}

export { Action };

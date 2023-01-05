import { Action } from "./action.js";

/**
 * Move a node on the map by a specified offset.
 * Options:
 * - nodeRef: the {NodeRef} to move
 * - offset: the {Vector3} offset to add to the node's current position on the map.
 */
class TranslateAction extends Action {
	async perform() {
		await this.context.mapper.translateNode(this.options.nodeRef, this.options.offset);

		// The undo action is just translating by the negated offset.
		return new TranslateAction(this.context, {
			nodeRef: this.options.nodeRef,
			offset: this.options.offset.multiplyScalar(-1),
		});
	}

	empty() {
		return false;
	}
}

export { TranslateAction };

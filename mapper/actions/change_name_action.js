import { Action } from "./action.js";

/** An action to change the name (label) of a node.
 * Options:
 * - name: The new name (label) for the node
 * - nodeRef: The {NodeRef} to change the name of.
 */
class ChangeNameAction extends Action {
	async perform() {
		// Preserve the old name for undo.
		const oldName = (await this.options.nodeRef.getPString("name")) || "";

		await this.options.nodeRef.setPString("name", this.options.name);
		await this.context.mapper.hooks.call("updateNode", this.options.nodeRef);

		// Undo is just changing back to the old name.
		return new ChangeNameAction(this.context, {nodeRef: this.options.nodeRef, name: oldName});
	}

	empty() {
		return false;
	}
}

export { ChangeNameAction };

import { Action } from "./action.js";
import { BulkAction } from "./bulk_action.js";
import { RemoveAction } from "./remove_action.js";
import { NodeCleanupAction } from "./node_cleanup_action.js";
import { asyncFrom } from "../utils.js";

class ChangeParentAction extends Action {
	async perform() {
		const oldParent = await this.options.nodeRef.getParent();
		await this.options.nodeRef.setParent(this.options.parent);
		await this.context.mapper.hooks.call("updateNode", this.options.parent);
		return new ChangeParentAction(this.context, {nodeRef: this.options.nodeRef, parent: oldParent});
	}
}

/** Merge nodes of the same type together.
 * Options:
 * - nodeRefs: Array of {NodeRef} to try to merge together
 */
class MergeAction extends Action {
	async perform() {
		const undoActions = [];

		if(await this.possible()) {
			const nodeRefs = await asyncFrom(this.getNodeRefs());
			const target = nodeRefs[0];
			for(const other of nodeRefs) {
				if(other !== target) {
					for(const childNodeRef of (await asyncFrom(other.getChildren()))) {
						undoActions.push(await this.context.performAction(new ChangeParentAction(this.context, {nodeRef: childNodeRef, parent: target}), false));
					}
					undoActions.push(await this.context.performAction(new RemoveAction(this.context, {nodeRefs: [other]})));
				}
			}

			undoActions.push(new NodeCleanupAction(this.context, {nodeRef: target}));
		}

		return new BulkAction(this.context, {actions: undoActions});
	}

	async possible() {
		const types = new Set();
		for await (const nodeRef of this.getNodeRefs()) {
			types.add((await nodeRef.getType()).id);
		}
		return types.size === 1;
	}

	async * getNodeRefs() {
		const nodeRefs = [];
		for(const nodeRef of this.options.nodeRefs) {
			if(await nodeRef.valid()) {
				nodeRefs.push(nodeRef);
			}
		}
		yield* nodeRefs;
	}
}

export { MergeAction };

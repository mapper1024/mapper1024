import { Action } from "./action.js";
import { UnremoveAction } from "./unremove_action.js";

class RemoveAction extends Action {
	async perform() {
		const affectedNodeRefs = await this.context.mapper.removeNodes(this.options.nodeRefs);
		return new UnremoveAction(this.context, {nodeRefs: affectedNodeRefs});
	}

	empty() {
		return this.options.nodeRefs.length === 0;
	}
}

export { RemoveAction };

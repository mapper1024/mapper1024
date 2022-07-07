import { Action } from "./action.js";
import { RemoveAction } from "./remove_action.js";

class UnremoveAction extends Action {
	async perform() {
		await this.context.mapper.unremoveNodes(this.options.nodeRefs);
		return new RemoveAction(this.context, {nodeRefs: this.options.nodeRefs});
	}

	empty() {
		return this.options.nodeRefs.length === 0;
	}
}

export { UnremoveAction };

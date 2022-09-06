import { Action } from "./action.js";
import { RemoveEdgeAction } from "./remove_edge_action.js";

class UnremoveEdgeAction extends Action {
	async perform() {
		await this.context.mapper.unremoveEdges(this.options.edgeRefs);
		return new RemoveEdgeAction(this.context, {edgeRefs: this.options.edgeRefs});
	}

	empty() {
		return this.options.edgeRefs.length === 0;
	}
}

export { UnremoveEdgeAction };

import { Action } from "./action.js";
import { UnremoveEdgeAction } from "./unremove_edge_action.js";

class RemoveEdgeAction extends Action {
	async perform() {
		await this.context.mapper.removeEdges(this.options.edgeRefs);
		return new UnremoveEdgeAction(this.context, {edgeRefs: this.options.edgeRefs});
	}

	empty() {
		return this.options.edgeRefs.length === 0;
	}
}

export { RemoveEdgeAction };

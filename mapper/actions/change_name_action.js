import { Action } from "./action.js";

class ChangeNameAction extends Action {
	async perform() {
		const oldName = (await this.options.nodeRef.getPString("name")) || "";
		await this.options.nodeRef.setPString("name", this.options.name);
		await this.context.mapper.hooks.call("updateNode", this.options.nodeRef);
		return new ChangeNameAction(this.context, {nodeRef: this.options.nodeRef, name: oldName});
	}

	empty() {
		return false;
	}
}

export { ChangeNameAction };

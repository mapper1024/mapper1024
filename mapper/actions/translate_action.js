import { Action } from "./action.js";

class TranslateAction extends Action {
	async perform() {
		await this.context.mapper.translateNode(this.options.nodeRef, this.options.offset);
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

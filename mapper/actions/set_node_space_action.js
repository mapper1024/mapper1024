import { Action } from "./index.js";

class SetNodeSpaceAction extends Action {
	async perform() {
		const undoAction = new SetNodeSpaceAction(this.context, {
			nodeRef: this.options.nodeRef,
			center: await this.options.nodeRef.getCenter(),
			radius: await this.options.nodeRef.getRadius(),
		});

		await this.options.nodeRef.setCenter(this.options.center);
		await this.options.nodeRef.setRadius(this.options.radius);

		return undoAction;
	}
}

export { SetNodeSpaceAction };

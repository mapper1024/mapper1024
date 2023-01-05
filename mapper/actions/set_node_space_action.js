import { Action } from "./index.js";

/**
 * Set a node's space (center & radius) on the map.
 * Options:
 * - nodeRef: the {NodeRef} referring to the node to modify
 * - center: the new center {Vector3}
 * - effectiveCenter: the new effective center {Vector3}
 * - radius: the new radius {Vector3}
 */
class SetNodeSpaceAction extends Action {
	async perform() {
		// The undo action just reverts back to the previous values.
		const undoAction = new SetNodeSpaceAction(this.context, {
			nodeRef: this.options.nodeRef,
			center: await this.options.nodeRef.getCenter(),
			effectiveCenter: await this.options.nodeRef.getEffectiveCenter(),
			radius: await this.options.nodeRef.getRadius(),
		});

		await this.options.nodeRef.setCenter(this.options.center);
		await this.options.nodeRef.setEffectiveCenter(this.options.effectiveCenter);
		await this.options.nodeRef.setRadius(this.options.radius);

		await this.context.mapper.hooks.call("updateNode", this.options.nodeRef);

		return undoAction;
	}
}

export { SetNodeSpaceAction };

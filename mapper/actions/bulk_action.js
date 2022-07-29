import { Action } from "./action.js";

/** An action composed of several actions. Will handle creating the needed bulk action to undo the actions in order.
 * Options:
 * - actions: An array of actions to perform.
 */
class BulkAction extends Action {
	async perform() {
		const actions = [];

		for(const action of this.options.actions.reverse()) {
			actions.push(await this.context.performAction(action, false));
		}

		return new BulkAction(this.context, {
			actions: actions,
		});
	}

	empty() {
		for(const action of this.options.actions) {
			if(!action.empty()) {
				return false;
			}
		}
		return true;
	}
}

export { BulkAction };

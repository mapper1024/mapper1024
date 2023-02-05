import { Action } from "./action.js";

/** An action composed of several actions. Will handle creating the needed bulk action to undo the actions in order.
 * Options:
 * - actions: An array of actions to perform.
 */
class BulkAction extends Action {
	async perform() {
		const actions = [];

		// Perform every action specified in the options, saving their undo actions.
		for(const action of this.options.actions) {
			actions.push(await this.context.performAction(action, false));
		}

		// The undo action for the entire bulk action is just another bulk action of the saved undo actions.
		return new BulkAction(this.context, {
			actions: actions.reverse(),
		});
	}

	// A bulk action is empty if all of its sub actions are also empty.
	empty() {
		for(const action of this.options.actions) {
			if(!action.empty()) {
				return false;
			}
		}
		return true;
	}

	allMatchesFilter(f) {
		for(const action of this.options.actions) {
			if(action instanceof BulkAction) {
				if(!action.allMatchesFilter(f)) {
					return false;
				}
			}
			else if(!f(action)) {
				return false;
			}
		}

		return true;
	}
}

export { BulkAction };

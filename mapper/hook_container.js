/** A simple hook system.
 * Allows registering functions to be called on arbitrary events/hooks,
 * and allows calling all functions registered for each event/hook.
 */
class HookContainer {
	constructor() {
		this.hooks = {};
	}

	/** Register a function to be called upon a specific hook.
	 * @param hookName {string} The name of the hook this method will be called on.
	 * @param hookFunction {function} A function that will be called when the specified hook is called.
	 * @returns {function} the function passed into the hook
	 */
	add(hookName, hookFunction) {
		if(!(hookName in this.hooks)) {
			this.hooks[hookName] = [];
		}

		this.hooks[hookName].push(hookFunction);

		return hookFunction;
	}

	/** Remove a function from being called upon a specific hook.
	 * @param hookName {string} The name of the hook to remove from.
	 * @param hookFunction {function} The function to remove from the hook.
	 */
	remove(hookName, hookFunction) {
		if(hookName in this.hooks) {
			this.hooks[hookName] = this.hooks[hookName].filter(f => f !== hookFunction);
		}
	}

	/** Call all functions registered for a specific hook.
	 * @param hookName {string} The hook to call.
	 * @param ...args Remaining arguments are passed to the hook functions.
	 */
	async call(hookName, ...args) {
		if(hookName in this.hooks) {
			for(const hookFunction of this.hooks[hookName]) {
				await hookFunction(...args);
			}
		}

		if("" in this.hooks) {
			for(const hookFunction of this.hooks[""]) {
				await hookFunction(hookName, ...args);
			}
		}
	}
}

export { HookContainer };

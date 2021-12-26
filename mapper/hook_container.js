class HookContainer {
	constructor() {
		this.hooks = {}
	}

	add(hookName, hookFunction) {
		if(!(hookName in this.hooks)) {
			this.hooks[hookName] = []
		}

		this.hooks[hookName].push(hookFunction)
	}

	remove(hookName, hookFunction) {
		if(hookName in this.hooks) {
			this.hooks[hookName] = this.hooks[hookName].filter(f => f !== hookFunction)
		}
	}

	call(hookName, ...args) {
		if(hookName in this.hooks) {
			for(const hookFunction in this.hooks[hookName]) {
				hookFunction(...args)
			}
		}
	}
}

export { HookContainer }

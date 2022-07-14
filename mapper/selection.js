class Selection {
	constructor(context, nodeIds) {
		this.context = context;
		this.originIds = new Set(nodeIds);
		this.parentNodeIds = new Set();
		this.selectedNodeIds = new Set(this.originIds);
		this.childNodeIds = new Set();
		this.siblingNodeIds = new Set();
		this.directSelectedNodeIds = new Set();
	}

	static async fromNodeIds(context, nodeIds) {
		const selection = new Selection(context, nodeIds);
		await selection.update();
		return selection;
	}

	static async fromNodeRefs(context, nodeRefs) {
		return await Selection.fromNodeIds(context, nodeRefs.map((nodeRef) => nodeRef.id));
	}

	async joinWith(other) {
		return Selection.fromNodeRefs(this.context, [...this.getOrigins(), ...other.getOrigins()]);
	}

	async update() {
		const selectedNodeIds = new Set(this.originIds);
		const parentNodeIds = new Set();
		const childNodeIds = new Set();
		const siblingNodeIds = new Set();
		const directSelectedNodeIds = new Set(this.originIds);

		for(const nodeRef of this.getOrigins()) {
			for await (const childNodeRef of nodeRef.getAllDescendants()) {
				selectedNodeIds.add(childNodeRef.id);
				directSelectedNodeIds.add(childNodeRef.id);
				childNodeIds.add(childNodeRef.id);
			}

			const parent = await nodeRef.getParent();
			if(parent) {
				selectedNodeIds.add(parent.id);
				parentNodeIds.add(parent.id);
				directSelectedNodeIds.add(parent.id);
				for await (const siblingNodeRef of parent.getAllDescendants()) {
					siblingNodeIds.add(siblingNodeRef.id);
					selectedNodeIds.add(siblingNodeRef.id);
				}
			}
		}

		this.originIds.forEach((id) => siblingNodeIds.delete(id));
		parentNodeIds.forEach((id) => siblingNodeIds.delete(id));
		childNodeIds.forEach((id) => siblingNodeIds.delete(id));

		this.parentNodeIds = parentNodeIds;
		this.selectedNodeIds = selectedNodeIds;
		this.childNodeIds = childNodeIds;
		this.siblingNodeIds = siblingNodeIds;
		this.directSelectedNodeIds = directSelectedNodeIds;
	}

	hasNodeRef(nodeRef) {
		return this.selectedNodeIds.has(nodeRef.id);
	}

	nodeRefIsOrigin(nodeRef) {
		return this.originIds.has(nodeRef.id);
	}

	nodeRefIsParent(nodeRef) {
		return this.parentNodeIds.has(nodeRef.id);
	}

	nodeRefIsChild(nodeRef) {
		return this.childNodeIds.has(nodeRef.id);
	}

	nodeRefIsSibling(nodeRef) {
		return this.siblingNodeIds.has(nodeRef.id);
	}

	* getOrigins() {
		for(const originId of this.originIds) {
			yield this.context.mapper.backend.getNodeRef(originId);
		}
	}

	exists() {
		return this.originIds.size > 0;
	}

	contains(other) {
		for(const nodeId of other.directSelectedNodeIds) {
			if(!this.directSelectedNodeIds.has(nodeId)) {
				return false;
			}
		}
		return true;
	}
}

export { Selection };

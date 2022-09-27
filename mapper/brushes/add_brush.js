import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { DrawPathAction } from "../actions/draw_path_action.js";
import { mod } from "../utils.js";
import { HookContainer } from "../hook_container.js";

class AddBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 0;
		this.nodeTypes = Array.from(this.context.mapper.backend.nodeTypeRegistry.getTypes());
		this.lastTypeChange = 0;

		this.hooks = new HookContainer();

		this.setNodeTypeIndex(0);
	}

	getLayer() {
		return this.context.mapper.backend.layerRegistry.get(this.getNodeType().def.layer);
	}

	displayButton(button) {
		button.innerText = "(A)dd";
		button.title = "Add Objects";
	}

	displaySidebar(brushbar, container) {
		const list = document.createElement("ul");
		list.setAttribute("class", "mapper1024_add_brush_strip");
		container.appendChild(list);

		for(const nodeType of this.nodeTypes) {
			const index = this.nodeTypes.indexOf(nodeType);

			const li = document.createElement("li");
			list.appendChild(li);

			const button = document.createElement("canvas");
			li.appendChild(button);

			button.width = brushbar.size.x - 8;
			button.height = brushbar.size.x - 8;

			button.title = nodeType.id;

			const c = button.getContext("2d");
			c.fillStyle = nodeType.def.color;
			c.fillRect(0, 0, button.width, button.height);

			c.textBaseline = "top";
			c.font = "12px sans";

			const text = nodeType.id;
			const firstMeasure = c.measureText(text);

			c.font = `${button.width / firstMeasure.width * 12}px sans`;
			const measure = c.measureText(text);
			const height = Math.abs(measure.actualBoundingBoxAscent) + Math.abs(measure.actualBoundingBoxDescent);
			c.globalAlpha = 0.25;
			c.fillStyle = "black";
			c.fillRect(0, 0, measure.width, height);
			c.globalAlpha = 1;
			c.fillStyle = "white";
			c.fillText(text, 0, 0);

			button.onclick = () => {
				this.setNodeTypeIndex(index);
				this.context.focus();
			};

			const update = () => {
				if(this.nodeTypeIndex === index) {
					button.style.border = "3px dotted black";
				}
				else {
					button.style.border = "0";
				}
			};

			update();

			this.hooks.add("type_changed", update);
		}
	}

	setNodeTypeIndex(index) {
		this.nodeTypeIndex = index;
		this.wrapIndex();
		this.lastTypeChange = performance.now();
		this.hooks.call("type_changed");
		this.context.requestRedraw();
	}

	getDescription() {
		return `Place ${this.getNodeType().getDescription()} (radius ${this.sizeInMeters()}m)`;
	}

	getNodeType() {
		return this.nodeTypes[this.nodeTypeIndex];
	}

	increment() {
		this.setNodeTypeIndex(this.nodeTypeIndex - 1);
	}

	decrement() {
		this.setNodeTypeIndex(this.nodeTypeIndex + 1);
	}

	wrapIndex() {
		const len = this.nodeTypes.length;
		this.nodeTypeIndex = (len == 0) ? -1 : mod(this.nodeTypeIndex, len);
	}

	typeRecentlyChanged() {
		return performance.now() - this.lastTypeChange < 3000;
	}

	async draw(context, position) {
		await super.draw(context, position);

		if((this.typeRecentlyChanged() || this.context.isKeyDown("q")) && this.nodeTypes.length > 0) {
			const radius = Math.min(4, Math.ceil(this.nodeTypes.length / 2));
			for(let i = -radius; i <= radius; i++) {
				const type = this.nodeTypes[mod(this.nodeTypeIndex - i, this.nodeTypes.length)];
				const text = type.getDescription();
				context.font = (i === 0) ? "bold 16px sans" : `${16 - Math.abs(i)}px sans`;
				context.fillText(text, position.x - this.getRadius() - context.measureText(text).width - 4, position.y + 4 + (-i) * 14);
			}
		}
	}

	async trigger(drawEvent) {
		const drawPathActionOptions = {
			path: drawEvent.path,
			radius: this.getRadius(),
			nodeType: this.getNodeType(),
			drawEvent: drawEvent,
			parent: this.parentNode,
			undoParent: this.undoParent,
			layer: this.getLayer(),
		};

		return await this.context.performAction(new DrawPathAction(this.context, drawPathActionOptions));
	}

	async activate(where) {
		const mouseDragEvent = new DrawEvent(this.context, where);

		const selectionParent = await mouseDragEvent.getSelectionParent();
		if(selectionParent && (await selectionParent.getType()).id === this.getNodeType().id) {
			this.parentNode = selectionParent;
			this.undoParent = false;
		}
		else {
			this.parentNode = await this.context.mapper.insertNode(this.context.canvasPointToMap(where), "object", {
				type: this.getNodeType(),
				radius: 0,
			});
			this.undoParent = true;
		}

		return mouseDragEvent;
	}
}

export { AddBrush };

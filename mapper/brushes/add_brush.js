import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { DrawPathAction } from "../actions/draw_path_action.js";
import { mod } from "../utils.js";
import { HookContainer } from "../hook_container.js";
import { NodeRender, tileSize } from "../node_render.js";

class AddBrush extends Brush {
	constructor(context) {
		super(context);

		this.nodeTypeIndex = 0;
		this.lastTypeChange = 0;

		this.hooks = new HookContainer();

		this.nodeTypes = this.originalNodeTypes = Array.from(this.context.mapper.backend.nodeTypeRegistry.getTypes());
		this.setNodeTypeIndex(0);

		const reset = (layer) => {
			this.nodeTypes = this.originalNodeTypes.filter((nodeType) => nodeType.getLayer() === layer.getType());
			this.setNodeTypeIndex(0);
		};

		this.hooks.add("current_layer_change", (layer) => reset(layer));
	}

	displayButton(button) {
		button.innerText = "(A)dd";
		button.title = "Add Objects";
	}

	async displaySidebar(brushbar, container) {
		const make = async (layer) => {
			container.innerHTML = "";

			const list = document.createElement("ul");
			list.setAttribute("class", "mapper1024_add_brush_strip");
			container.appendChild(list);

			const shouldDisplay = (nodeType) => {
				if(!nodeType.getParent()) {
					return true;
				}

				if(this.getNodeType().id === nodeType.getParent().id) {
					return true;
				}

				if(this.getNodeType().getParent() && this.getNodeType().getParent().id === nodeType.getParent().id) {
					return true;
				}

				return false;
			};

			for(const nodeType of this.nodeTypes) {
				if(nodeType.getLayer() === layer.getType() && shouldDisplay(nodeType)) {
					const index = this.nodeTypes.indexOf(nodeType);

					const li = document.createElement("li");
					list.appendChild(li);

					const button = document.createElement("canvas");
					li.appendChild(button);

					const squareSize = brushbar.size.x - 8;
					const squareRadius = Math.floor(squareSize / 2 + 0.5);

					button.width = squareSize;
					button.height = squareSize;

					button.title = nodeType.id;

					const c = button.getContext("2d");

					await NodeRender.drawThumbnailRadius(c, nodeType, squareRadius, squareRadius, squareRadius);

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

					const children = Array.from(nodeType.getChildren());
					const childWidth = Math.ceil(button.width / children.length);
					const childHeight = Math.ceil(button.height / 3);
					const childRadius = Math.ceil(Math.min(childWidth, childHeight) / 2);

					for(let i = 0; i < children.length; i++) {
						await NodeRender.drawThumbnailRadius(c, children[i], i * childRadius * 2 + childRadius, button.height - childRadius, childRadius);

						c.strokeStyle = this.getNodeType().id === children[i].id ? "black" : "white";
						c.strokeRect(i * childRadius * 2, button.height - childRadius * 2, childRadius * 2, childRadius * 2);
					}

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

			await brushbar.recalculate();
		};

		await make(this.context.getCurrentLayer());
		this.hooks.add("current_layer_change", async (layer) => await make(layer));
		this.hooks.add("type_changed", async () => await make(this.context.getCurrentLayer()));
	}

	signalLayerChange(layer) {
		this.hooks.call("current_layer_change", layer);
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
			layer: this.context.getCurrentLayer(),
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

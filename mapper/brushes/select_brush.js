import { Brush } from "./brush.js";
import { Selection } from "../selection.js";
import { TranslateEvent } from "../drag_events/translate_event.js";
import { ChangeNameAction } from "../actions/index.js";
import { NodeRender } from "../node_render.js";

class SelectBrush extends Brush {
	constructor(context) {
		super(context);
	}

	displayButton(button) {
		button.innerText = "Select";
		button.title = "Select Objects [shortcut: 's']";
	}

	getDescription() {
		return "Select/Move";
	}

	async draw(context, position) {
		context;
		position;
	}

	async activate(where) {
		if(!this.context.hoveringOverSelection()) {
			if(this.context.hoverSelection.exists()) {
				const newSelection = await Selection.fromNodeIds(this.context, this.context.hoverSelection.parentNodeIds);

				if(newSelection !== null) {
					if(this.context.isKeyDown("Control")) {
						await this.context.updateSelection(await this.context.selection.joinWith(newSelection));
					}
					else {
						await this.context.updateSelection(newSelection);
					}
				}
			}
			else {
				await this.context.updateSelection(new Selection(this.context, []));
			}
		}

		let ret;

		if(this.context.hoveringOverSelection()) {
			ret = new TranslateEvent(this.context, where, Array.from(this.context.selection.getOrigins()));
		}
		else {
			await this.context.updateSelection(new Selection(this, []));
		}

		return ret;
	}

	async getSelectedNodeRef() {
		const originNodeRefs = Array.from(this.context.selection.getOrigins());
		if(originNodeRefs.length === 1) {
			// Exactly one node selected.
			const nodeRef = originNodeRefs[0];
			if(await nodeRef.valid()) {
				return nodeRef;
			}
			else {
				return null;
			}
		}
		else {
			// 0 or 2+ nodes selected, so we can't return just one.
			return null;
		}
	}

	async displaySidebar(brushbar, container) {
		const make = async (nodeRef) => {
			if(nodeRef) {
				container.innerText = "";

				const nodeType = await nodeRef.getType();

				const idRow = document.createElement("div");
				idRow.setAttribute("class", "mapper1024_property_row");
				idRow.innerText = `Node #${nodeRef.id}`;
				container.appendChild(idRow);

				const imageRow = document.createElement("div");
				imageRow.setAttribute("class", "mapper1024_property_row");
				container.appendChild(imageRow);

				const image = document.createElement("canvas");
				imageRow.appendChild(image);

				const squareSize = Math.floor(brushbar.size.x / 2 - 8);
				const squareRadius = Math.floor(squareSize / 2 + 0.5);

				image.width = squareSize;
				image.height = squareSize;

				image.setAttribute("style", `width: ${squareSize}px; height: ${squareSize}px`);

				const c = image.getContext("2d");

				await NodeRender.drawThumbnailRadius(c, nodeType, squareRadius, squareRadius, squareRadius);

				c.textBaseline = "top";
				c.font = "12px sans";

				const text = nodeType.id;
				const firstMeasure = c.measureText(text);

				c.font = `${image.width / firstMeasure.width * 12}px sans`;
				const measure = c.measureText(text);
				const height = Math.abs(measure.actualBoundingBoxAscent) + Math.abs(measure.actualBoundingBoxDescent);
				c.globalAlpha = 0.25;
				c.fillStyle = "black";
				c.fillRect(0, 0, measure.width, height);
				c.globalAlpha = 1;
				c.fillStyle = "white";
				c.fillText(text, 0, 0);

				const nameLabel = document.createElement("h2");
				nameLabel.innerText = "Label";
				container.appendChild(nameLabel);

				const nameRow = document.createElement("div");
				nameRow.setAttribute("class", "mapper1024_property_row");
				container.appendChild(nameRow);

				const submit = async () => {
					await this.context.performAction(new ChangeNameAction(this.context, {nodeRef: nodeRef, name: nameInput.value}), true);
				}

				const nameInput = document.createElement("input");
				nameInput.setAttribute("size", 1);
				nameInput.value = (await nodeRef.getPString("name")) || "";
				nameInput.addEventListener("keyup", (event) => {
					if(event.key === "Enter") {
						submit();
						event.preventDefault();
					}
				});
				nameRow.appendChild(nameInput);

				const nameButton = document.createElement("button");
				nameButton.innerText = "💾";
				nameButton.onclick = () => {
					submit();
				}
				nameRow.appendChild(nameButton);
			}
			else {
				container.innerText = "";
			}
		};

		await make(await this.getSelectedNodeRef());
		this.hooks.add("context_selection_change", async () => {
			await make(await this.getSelectedNodeRef());
		});
		this.hooks.add("mapper_update", async () => {
			await make(await this.getSelectedNodeRef());
		});
	}
}

export { SelectBrush };

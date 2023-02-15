import { Brush } from "./brush.js";
import { Selection } from "../selection.js";
import { TranslateEvent } from "../drag_events/translate_event.js";
import { ChangeNameAction, MergeAction } from "../actions/index.js";
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

	usesSelection() {
		return true;
	}

	usesHover() {
		return true;
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

	async displaySidebar(brushbar, container) {
		const make = async () => {
			const originNodeRefsAll = Array.from(this.context.selection.getOrigins());
			const originNodeRefs = [];

			for(const nodeRef of originNodeRefsAll) {
				if(await nodeRef.valid()) {
					originNodeRefs.push(nodeRef);
				}
			}

			container.innerText = "";

			const drawNodeRef = async (nodeRef, container) => {
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
			};

			if(originNodeRefs.length === 1) {
				const nodeRef = originNodeRefs[0];

				await drawNodeRef(nodeRef, container);

				const nameLabel = document.createElement("h2");
				nameLabel.innerText = "Label";
				container.appendChild(nameLabel);

				const nameRow = document.createElement("div");
				nameRow.setAttribute("class", "mapper1024_property_row");
				container.appendChild(nameRow);

				const submit = async () => {
					await this.context.performAction(new ChangeNameAction(this.context, {nodeRef: nodeRef, name: nameInput.value}), true);
				};

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
				};
				nameRow.appendChild(nameButton);
			}
			else if(originNodeRefs.length > 1) {
				const mergeAction = new MergeAction(this.context, {nodeRefs: originNodeRefs});
				if(await mergeAction.possible()) {
					const mergeButton = document.createElement("button");
					mergeButton.innerText = "Merge";
					mergeButton.title = "Merge selected nodes together [shortcut: m]";
					mergeButton.onclick = async () => {
						await this.context.performAction(mergeAction, true);
					};
					container.appendChild(mergeButton);
				}

				for(const nodeRef of originNodeRefs) {
					await drawNodeRef(nodeRef, container);
				}
			}
			else {
				container.innerText = "";
			}
		};

		await make();
		this.hooks.add("context_selection_change", async () => {
			await make();
		});
		this.hooks.add("mapper_update", async () => {
			await make();
		});
	}
}

export { SelectBrush };

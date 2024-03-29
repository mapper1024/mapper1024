import { Vector3 } from "./geometry.js";
import { HookContainer } from "./hook_container.js";

class Brushbar {
	constructor(context) {
		this.context = context;

		this.targetWidth = 160;
		this.hooks = new HookContainer();

		this.element = document.createElement("div");
		this.element.setAttribute("class", "mapper1024_brush_bar");
		this.element.style.position = "absolute";
		this.context.parent.appendChild(this.element);

		const title = document.createElement("span");
		title.innerText = "Mouse over buttons to see keyboard shortcuts";
		this.element.appendChild(title);

		this.element.appendChild(document.createElement("hr"));

		this.systemButtons = document.createElement("span");
		this.element.appendChild(this.systemButtons);

		this.element.appendChild(document.createElement("hr"));

		if(this.context.inNormalMode()) {
			const exportButton = document.createElement("button");
			exportButton.setAttribute("class", "mapper1024_zoom_button");
			exportButton.setAttribute("title", "Export [shortcut: Control+e]");
			exportButton.innerText = "📷 Export as image...";
			exportButton.onclick = () => {
				this.context.openExportModal();
			};
			this.element.appendChild(exportButton);

			this.element.appendChild(document.createElement("hr"));
		}

		if(this.context.inNormalMode()) {
			const undoRow = document.createElement("div");
			undoRow.setAttribute("class", "mapper1024_zoom_row");
			this.element.appendChild(undoRow);

			const undo = document.createElement("button");
			undo.setAttribute("class", "mapper1024_zoom_button");
			undo.innerText = "⟲ Undo";
			undo.setAttribute("title", "Undo [shortcut: Control+z]");
			undo.onclick = async () => {
				await this.context.undo();
				this.context.focus();
			};
			undoRow.appendChild(undo);

			const undoStatus = document.createElement("span");
			undoRow.appendChild(undoStatus);

			const separator = document.createElement("span");
			separator.innerText = "|";
			undoRow.appendChild(separator);

			const redoStatus = document.createElement("span");
			undoRow.appendChild(redoStatus);

			const redo = document.createElement("button");
			redo.setAttribute("class", "mapper1024_zoom_button");
			redo.innerText = "⟳ Redo";
			redo.setAttribute("title", "Redo [shortcut: Control+y]");
			redo.onclick = async () => {
				await this.context.redo();
				this.context.focus();
			};
			undoRow.appendChild(redo);

			const updateUndoStatus = () => {
				undoStatus.innerText = `${this.context.undoStack.length}`;
				redoStatus.innerText = `${this.context.redoStack.length}`;
				undo.disabled = this.context.undoStack.length === 0;
				redo.disabled = this.context.redoStack.length === 0;
			};

			this.context.hooks.add("undid", updateUndoStatus);
			this.context.hooks.add("redid", updateUndoStatus);
			this.context.hooks.add("action", updateUndoStatus);
			this.context.hooks.add("undo_pushed", updateUndoStatus);
			this.context.hooks.add("do_stripped", updateUndoStatus);
			updateUndoStatus();

			this.element.appendChild(document.createElement("hr"));
		}

		const zoomLabel = document.createElement("span");
		this.element.appendChild(zoomLabel);

		let zoomLevelInput;

		{
			const zoomLevelLabel = document.createElement("div");
			zoomLevelLabel.innerText = "Zoom level:";
			this.element.appendChild(zoomLevelLabel);

			const zoomLevelRow = document.createElement("div");
			zoomLevelRow.setAttribute("class", "mapper1024_property_row");
			this.element.appendChild(zoomLevelRow);

			zoomLevelInput = document.createElement("input");

			const zoomLevelSubmit = () => {
				this.context.requestZoomChange(zoomLevelInput.value);
			};

			zoomLevelInput.setAttribute("class", "mapper1024_property_number");
			zoomLevelInput.setAttribute("type", "number");
			zoomLevelInput.setAttribute("min", "1");
			zoomLevelInput.addEventListener("keyup", (event) => {
				if(event.key === "Enter") {
					zoomLevelSubmit();
					event.preventDefault();
					this.context.focus();
				}
			});
			zoomLevelInput.addEventListener("change", () => {
				zoomLevelSubmit();
				this.context.focus();
			});
			zoomLevelRow.appendChild(zoomLevelInput);

			const zoomLevelButton = document.createElement("button");
			zoomLevelButton.innerText = "💾";
			zoomLevelButton.onclick = () => {
				zoomLevelSubmit();
				this.context.focus();
			};
			zoomLevelRow.appendChild(zoomLevelButton);
		}

		let screenDiagonalInput;

		{
			const screenDiagonalLabel = document.createElement("div");
			screenDiagonalLabel.innerText = "Screen diagonal (km):";
			this.element.appendChild(screenDiagonalLabel);

			const screenDiagonalRow = document.createElement("div");
			screenDiagonalRow.setAttribute("class", "mapper1024_property_row");
			this.element.appendChild(screenDiagonalRow);

			screenDiagonalInput = document.createElement("input");

			const screenDiagonalSubmit = () => {
				const diagonalPixels = (new Vector3(0, 0, 0)).subtract(this.context.screenSize()).length();
				const newZoom = this.context.unitsPerPixelToZoom(this.context.mapper.metersToUnits(screenDiagonalInput.value * 1000 / diagonalPixels));
				this.context.requestZoomChange(newZoom);
			};

			screenDiagonalInput.setAttribute("class", "mapper1024_property_number");
			screenDiagonalInput.setAttribute("type", "number");
			screenDiagonalInput.setAttribute("min", "1");
			screenDiagonalInput.setAttribute("step", 10);
			screenDiagonalInput.addEventListener("keyup", (event) => {
				if(event.key === "Enter") {
					screenDiagonalSubmit();
					event.preventDefault();
					this.context.focus();
				}
			});
			screenDiagonalInput.addEventListener("change", () => {
				screenDiagonalSubmit();
				this.context.focus();
			});
			screenDiagonalRow.appendChild(screenDiagonalInput);

			const screenDiagonalButton = document.createElement("button");
			screenDiagonalButton.innerText = "💾";
			screenDiagonalButton.onclick = () => {
				screenDiagonalSubmit();
				this.context.focus();
			};
			screenDiagonalRow.appendChild(screenDiagonalButton);
		}

		//const screenDiagonalZoomInput;

		const zoomRow = document.createElement("div");
		zoomRow.setAttribute("class", "mapper1024_zoom_row");
		this.element.appendChild(zoomRow);

		const zoomIn = document.createElement("button");
		zoomIn.setAttribute("class", "mapper1024_zoom_button");
		zoomIn.innerText = "🔍+";
		zoomIn.setAttribute("title", "Zoom in [shortcut: scroll up or press Control-'+' or Control-'=']");
		zoomIn.onclick = () => {
			this.context.requestZoomChangeDelta(-1);
			this.context.focus();
		};
		zoomRow.appendChild(zoomIn);

		const reset = document.createElement("button");
		reset.setAttribute("class", "mapper1024_zoom_button");
		reset.innerText = "↺";
		reset.setAttribute("title", "Reset zoom and pan [shortcut: Control+c]");
		reset.onclick = async () => {
			await this.context.resetOrientation();
			this.context.focus();
		};
		zoomRow.appendChild(reset);

		const zoomOut = document.createElement("button");
		zoomOut.setAttribute("class", "mapper1024_zoom_button");
		zoomOut.innerText = "🔍-";
		zoomOut.setAttribute("title", "Zoom out [shortcut: scroll down or press Control+'-']");
		zoomOut.onclick = () => {
			this.context.requestZoomChangeDelta(1);
			this.context.focus();
		};
		zoomRow.appendChild(zoomOut);

		this.element.appendChild(document.createElement("hr"));

		if(this.context.inControlledMode()) {
			const size = document.createElement("span");

			if(this.context.inNormalMode()) {
				this.element.appendChild(size);
			}

			const updateSize = (brush) => {
				if(brush === this.context.brush) {
					if(this.context.inNormalMode()) {
						size.innerText = `Brush radius ${Math.floor(brush.sizeInMeters() + 0.5)}m`;
					}
					zoomLevelInput.value = this.context.requestedZoom;
					screenDiagonalInput.value = Math.ceil((this.context.mapper.unitsToMeters(this.context.zoomFactor(this.context.requestedZoom) * (new Vector3(0, 0, 0)).subtract(this.context.screenSize()).length()) / 1000));
					zoomLabel.innerText = `1px = ${this.context.mapper.unitsToMeters(this.context.zoomFactor(this.context.requestedZoom)).toFixed(2)}km`;
				}
			};

			updateSize(this.context.brush);

			this.context.hooks.add("size_change", () => updateSize(this.context.brush));
			this.context.hooks.add("brush_size_change", updateSize);
			this.context.hooks.add("changed_brush", updateSize);
			this.context.hooks.add("changed_zoom", () => updateSize(this.context.brush));
			this.context.hooks.add("requested_zoom", () => updateSize(this.context.brush));

			if(this.context.inNormalMode()) {
				this.element.appendChild(document.createElement("br"));

				const brushSizeRow = document.createElement("div");
				brushSizeRow.setAttribute("class", "mapper1024_zoom_row");
				this.element.appendChild(brushSizeRow);

				const sizeUp = document.createElement("button");
				sizeUp.setAttribute("class", "mapper1024_brush_size_button");
				sizeUp.innerText = "+";
				sizeUp.setAttribute("title", "Increase brush size [shortcut: Hold 'w' and scroll up]");
				sizeUp.onclick = () => {
					this.context.brush.enlarge();
					this.context.requestRedraw();
					this.context.focus();
				};
				brushSizeRow.appendChild(sizeUp);

				const sizeDown = document.createElement("button");
				sizeDown.setAttribute("class", "mapper1024_brush_size_button");
				sizeDown.innerText = "-";
				sizeDown.setAttribute("title", "Decrease brush size [shortcut: Hold 'w' and scroll down]");
				sizeDown.onclick = () => {
					this.context.brush.shrink();
					this.context.requestRedraw();
					this.context.focus();
				};
				brushSizeRow.appendChild(sizeDown);

				this.element.appendChild(document.createElement("hr"));

				const brushButtonContainer = document.createElement("div");
				brushButtonContainer.setAttribute("class", "mapper1024_brush_button_container");
				this.element.appendChild(brushButtonContainer);

				const brushButton = (brush) => {
					const button = document.createElement("button");
					button.setAttribute("class", "mapper1024_brush_button");
					brush.displayButton(button);
					button.onclick = () => {
						this.context.changeBrush(brush);
						this.context.focus();
					};

					this.context.hooks.add("changed_brush", (newBrush) => {
						button.style["font-weight"] = brush === newBrush ? "bold" : "normal";
					});

					return button;
				};

				for(const brushName in this.context.brushes) {
					const button = brushButton(this.context.brushes[brushName]);
					brushButtonContainer.appendChild(button);
				}

				this.element.appendChild(document.createElement("hr"));

				const layerButtonContainer = document.createElement("div");
				layerButtonContainer.setAttribute("class", "mapper1024_brush_button_container");
				this.element.appendChild(layerButtonContainer);

				const layerButton = (layer) => {
					const button = document.createElement("button");
					button.setAttribute("class", "mapper1024_brush_button");
					button.innerText = layer.getDescription();
					button.title = `Switch to the ${layer.getDescription()} layer [shortcut: 'l']`;
					button.onclick = () => {
						this.context.setCurrentLayer(layer);
						this.context.focus();
					};

					this.context.hooks.add("current_layer_change", (newLayer) => {
						button.style["font-weight"] = layer.id === newLayer.id ? "bold" : "normal";
					});

					return button;
				};

				for(const layer of this.context.mapper.backend.layerRegistry.getLayers()) {
					const button = layerButton(layer);
					layerButtonContainer.appendChild(button);
				}

				this.element.appendChild(document.createElement("hr"));
			}
		}

		this.brushStrip = document.createElement("span");

		this.recalculate();

		this.context.hooks.add("size_change", this.recalculate.bind(this));
		this.context.hooks.add("changed_brush", async (brush) => {
			this.brushStrip.remove();
			this.brushStrip = document.createElement("div");
			this.brushStrip.setAttribute("class", "mapper1024_brush_strip");
			await brush.displaySidebar(this, this.brushStrip);
			this.element.appendChild(this.brushStrip);
		});
		this.context.hooks.add("disconnect", this.disconnect.bind(this));
	}

	setSystemButtons(systemButtons) {
		this.systemButtons.replaceWith(systemButtons);
		this.systemButtons = systemButtons;
	}

	async recalculate() {
		const padding = 32;
		const hPadding = 8;
		const screenSize = this.context.screenSize();
		const size = new Vector3(this.targetWidth, screenSize.y - padding * 2, 0);
		this.element.style.width = `${size.x}px`;
		this.element.style.height = `${size.y}px`;
		this.element.style.backgroundColor = "#eeeeeebb";
		this.size = size;

		const actualXSize = size.x + (this.element.offsetWidth - this.element.clientWidth);

		const where = new Vector3(screenSize.x - actualXSize - hPadding - this.context.canvasOffset().x, padding + this.context.canvasOffset().y, 0);
		this.element.style.left = `${where.x}px`;
		this.element.style.top = `${where.y}px`;

		this.element.style.width = `${actualXSize}px`;

		await this.hooks.call("size_change", size);
	}

	disconnect() {
		this.element.remove();
	}
}

export { Brushbar };

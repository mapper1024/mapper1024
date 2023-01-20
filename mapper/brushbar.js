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

		const undoRow = document.createElement("div");
		undoRow.setAttribute("class", "mapper1024_zoom_row");
		this.element.appendChild(undoRow);

		const undo = document.createElement("button");
		undo.setAttribute("class", "mapper1024_zoom_button");
		undo.innerText = "⟲";
		undo.setAttribute("title", "Undo [shortcut: Control+z]");
		undo.onclick = async () => {
			await this.context.undo();
			this.context.focus();
		};
		undoRow.appendChild(undo);

		const undoStatus = document.createElement("span");
		undoRow.appendChild(undoStatus);

		const redo = document.createElement("button");
		redo.setAttribute("class", "mapper1024_zoom_button");
		redo.innerText = "⟳";
		redo.setAttribute("title", "Redo [shortcut: Control+y]");
		redo.onclick = async () => {
			await this.context.redo();
			this.context.focus();
		};
		undoRow.appendChild(redo);

		const updateUndoStatus = () => {
			undoStatus.innerText = `${this.context.undoStack.length} --- ${this.context.redoStack.length}`;
			undo.disabled = this.context.undoStack.length === 0;
			redo.disabled = this.context.redoStack.length === 0;
		};

		this.context.hooks.add("undid", updateUndoStatus);
		this.context.hooks.add("redid", updateUndoStatus);
		this.context.hooks.add("action", updateUndoStatus);
		this.context.hooks.add("undo_pushed", updateUndoStatus);
		updateUndoStatus();

		this.element.appendChild(document.createElement("hr"));

		const zoomLabel = document.createElement("span");
		this.element.appendChild(zoomLabel);

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

		const size = document.createElement("span");
		this.element.appendChild(size);

		const updateSize = (brush) => {
			if(brush === this.context.brush) {
				size.innerText = `Brush radius ${Math.floor(brush.sizeInMeters() + 0.5)}m`;
				zoomLabel.innerText = `Zoom ${this.context.requestedZoom}/${this.context.maxZoom}\n1px = ${this.context.mapper.unitsToMeters(this.context.zoomFactor(this.context.requestedZoom)).toFixed(2)}m`;
			}
		};

		updateSize(this.context.brush);

		this.element.appendChild(document.createElement("br"));

		this.context.hooks.add("brush_size_change", updateSize);
		this.context.hooks.add("changed_brush", updateSize);
		this.context.hooks.add("changed_zoom", () => updateSize(this.context.brush));
		this.context.hooks.add("requested_zoom", () => updateSize(this.context.brush));

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

		const where = new Vector3(screenSize.x - actualXSize - hPadding, padding, 0);
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

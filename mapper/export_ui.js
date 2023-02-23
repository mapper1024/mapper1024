import { HookContainer } from "./hook_container.js";
import { RectangleSelectBrush } from "./brushes/index.js";

class ExportUI {
	constructor(context) {
		this.context = context;
		this.hooks = new HookContainer();
	}

	async show() {
		this.previewMapper = this.context.mapper.render(this.context.parent, {
			mode: "preview",
		});

		this.exportBrush = new RectangleSelectBrush(this.previewMapper);
		this.previewMapper.changeBrush(this.exportBrush);

		const systemButtons = document.createElement("div");
		systemButtons.setAttribute("class", "mapper1024_zoom_row");
		this.previewMapper.brushbar.setSystemButtons(systemButtons);

		const exportButton = document.createElement("button");
		exportButton.setAttribute("class", "mapper1024_zoom_button");
		exportButton.setAttribute("title", "Export [Shortcut: Enter]");
		exportButton.innerText = "📷 Export...";
		exportButton.disabled = true;
		exportButton.onclick = async () => {
			await this.exportImage();
		};
		systemButtons.appendChild(exportButton);

		this.exportBrush.hooks.add("change_box", async (box) => {
			exportButton.disabled = !box;
		});

		const cancelButton = document.createElement("button");
		cancelButton.setAttribute("class", "mapper1024_zoom_button");
		cancelButton.setAttribute("title", "Cancel [shortcut: Escape]");
		cancelButton.innerText = "🗙 Cancel";
		cancelButton.onclick = () => {
			this.close();
		};
		systemButtons.appendChild(cancelButton);

		this.previewMapper.registerKeyboardShortcut((context, event) => event.key === "Escape", async () => this.close());
		this.previewMapper.registerKeyboardShortcut((context, event) => event.key === "Enter" && !exportButton.disabled, async () => await this.exportImage());

		this.previewMapper.setScrollOffset(this.context.scrollOffset);
		await this.previewMapper.forceZoom(this.context.zoom);

		this.previewMapper.focus();

		return new Promise((resolve) => {
			this.hooks.add("closed", resolve);
		});
	}

	async exportImage() {
		const box = this.exportBrush.absoluteCanvasBox();

		const exportMapper = this.context.mapper.render(document.createElement("div"), {
			mode: "export",
			exportBox: box,
		});

		await exportMapper.forceZoom(this.previewMapper.zoom);
		exportMapper.setScrollOffset(box.a);

		let calculated = false;

		await new Promise((resolve) => {
			exportMapper.hooks.add("calculated", () => {
				if(exportMapper.zoom === this.previewMapper.zoom) {
					calculated = true;
				}
			});

			exportMapper.hooks.add("drawn", () => {
				if(calculated) {
					resolve();
				}
			});
		});

		const a = document.createElement("a");
		a.href = exportMapper.canvas.toDataURL();
		a.download = `Map export at ${new Date(Date.now()).toISOString()}.png`;
		a.click();

		exportMapper.disconnect();

		this.close();
	}

	close() {
		this.previewMapper.disconnect();
		this.hooks.call("closed");
	}
}

export { ExportUI };

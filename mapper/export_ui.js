import { HookContainer } from "./hook_container.js";
import { RectangleSelectBrush } from "./brushes/index.js";

class ExportUI {
	constructor(context) {
		this.context = context;
		this.hooks = new HookContainer();

		this.element = document.createElement("div");
		this.element.onkeydown = (event) => {
			if(event.key === "Escape") {
				this.close();
			}
		};

		this.infoSpan = document.createElement("span");
		this.infoSpan.innerText = "Select an area to be exported as an image";
		this.element.appendChild(this.infoSpan);

		this.element.appendChild(document.createElement("hr"));

		this.preview = document.createElement("div");
		this.preview.style.height = "75vh";
		this.preview.style.width = "75vw";

		this.element.appendChild(this.preview);
		this.element.focus();
	}

	async show() {
		this.context.parent.appendChild(this.element);
		this.previewMapper = this.context.mapper.render(this.preview, {
			mode: "preview",
		});

		const brush = new RectangleSelectBrush(this.previewMapper);

		const update = async () => {
			if(brush.box) {
				const absoluteCanvasBox = brush.box.map(v => this.previewMapper.mapPointToAbsoluteCanvas(v).map(c => Math.floor(c)));
				const absoluteCanvasBoxSize = absoluteCanvasBox.b.subtract(absoluteCanvasBox.a);
				this.infoSpan.innerText = `${absoluteCanvasBoxSize.x}x${absoluteCanvasBoxSize.y} pixels at zoom level ${this.previewMapper.zoom}`;
			}
		}

		brush.hooks.add("change_box", update);
		this.previewMapper.hooks.add("changed_zoom", update);

		this.previewMapper.changeBrush(brush);

		this.previewMapper.setScrollOffset(this.context.scrollOffset);
		await this.previewMapper.forceZoom(this.context.zoom);

		this.previewMapper.focus();

		return new Promise((resolve) => {
			this.hooks.add("closed", resolve);
		});
	}

	close() {
		this.previewMapper.disconnect();
		this.element.remove();
		this.hooks.call("closed");
	}
}

export { ExportUI };

import { HookContainer } from "./hook_container.js";

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

		this.preview = document.createElement("div");
		this.preview.style.height = "50vh";
		this.preview.style.width = "50vw";

		this.element.appendChild(this.preview);
		this.element.focus();
	}

	async show() {
		this.context.parent.appendChild(this.element);
		this.previewMapper = this.context.mapper.render(this.preview, {
			mode: "preview",
		});

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

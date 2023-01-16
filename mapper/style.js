function style() {
	const styleElement = document.createElement("style");
	styleElement.innerHTML = `
.mapper1024_brush_bar {
	overflow-y: auto;
	overflow-x: hidden;
}

.mapper1024_brush_strip {
	word-wrap: break-word;
}

.mapper1024_brush_button_container {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-around;
}

.mapper1024_brush_button {
	padding: 0;
	margin: 0;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

.mapper1024_brush_size_button {
	padding: 0;
	margin: 0;
	font: 32px bold sans;
	width: 32px;
	height: 32px;
	text-align: center;
	line-height: 0;
}

.mapper1024_zoom_row {
	display: flex;
	justify-content: space-between;
	margin-top: 0.1em;
}

.mapper1024_add_brush_strip {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.mapper1024_add_brush_strip > canvas {
	object-fit: none;
}
	`;
	return styleElement;
}

export { style };

function style() {
	const styleElement = document.createElement("style");
	styleElement.innerHTML = `
.mapper1024_brush_strip {
	word-wrap: break-word;
}

.mapper1024_brush_button_container {
	display: flex;
	flex-wrap: wrap;
}

.mapper1024_brush_button {
	padding: 0;
	margin: 0;
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

.mapper1024_add_brush_strip {
	margin: 0;
	padding: 0;
}

.mapper1024_add_brush_strip > li {
	list-style-type: none;
}

.mapper1024_add_brush_strip > li > button {
}
	`;
	return styleElement;
}

export { style };

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

.mapper1024_brush_strip > h2 {
	padding: 0;
	margin: 0;
	margin-top: 0.1em;
	margin-bottom: 0.1em;
	font-weight: normal;
	font-size: 1.1em;
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

.mapper1024_add_brush_box {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	margin-top: 0.25em;
	margin-bottom: 0.25em;
	border: 2px dashed black;
	padding: 2px 2px 2px 2px;
}

.mapper1024_add_brush_button {
	object-fit: none;
	margin-bottom: 0.25em;
}

.mapper1024_property_row {
	display: flex;
	justify-content: space-around;
}

.mapper1024_property_row > input {
	flex: 3 1 0;
}
	`;
	return styleElement;
}

export { style };

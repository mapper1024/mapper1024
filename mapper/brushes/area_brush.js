import { Brush } from "./brush.js";
import { DrawEvent } from "../drag_events/draw_event.js";
import { Action, BulkAction } from "../actions/index.js";
import { tileSize } from "../node_render.js";
import { Box3, Vector3 } from "../geometry.js";

class AreaBrushAdd extends Action {
	empty() {
		return this.options.toAdd.length === 0;
	}

	async perform() {
		for(const pair of this.options.toAdd) {
			this.options.brush.tiles[pair[0]][pair[1]] = true;
		}

		await this.options.brush.hooks.call("update");

		return new AreaBrushDelete(this.context, {brush: this.options.brush, toRemove: this.options.toAdd});
	}
}

class AreaBrushDelete extends Action {
	empty() {
		return this.options.toRemove.length === 0;
	}

	async perform() {
		for(const pair of this.options.toRemove) {
			delete this.options.brush.tiles[pair[0]][pair[1]];
		}

		await this.options.brush.hooks.call("update");

		return new AreaBrushAdd(this.context, {brush: this.options.brush, toAdd: this.options.toRemove});
	}
}

class AreaBrush extends Brush {
	constructor(context) {
		super(context);

		this.tiles = {};
		this.hooks.add("context_changed_zoom", async () => {
			await this.reset();
		});

		this.hooks.add("update", () => {
			this.context.requestRedraw();
		});
	}

	async reset() {
		const toRemove = [];
		for(const x in this.tiles) {
			const tilesX = this.tiles[x];
			for(const y in tilesX) {
				toRemove.push([x, y]);
			}
		}

		await this.context.performAction(new AreaBrushDelete(this.context, {brush: this, toRemove: toRemove}), true);
		const f = (action) => action instanceof AreaBrushAdd || action instanceof AreaBrushDelete;
		await this.context.stripDoStack(action => (f(action) || (action instanceof BulkAction && action.allMatchesFilter(f))));
	}

	async displaySidebar(brushbar, container) {
		const make = async () => {
			const squareMeters = this.getAreaSelectedSquareMeters();
			const squareKilometers = squareMeters / (1000 ** 2);
			container.innerText = `${squareKilometers.toFixed(2)}km²`;

			container.appendChild(document.createElement("hr"));

			const resetButton = document.createElement("button");
			resetButton.innerText = "Reset";
			resetButton.title = "Reset selected tiles [shortcut: Shift+c]";
			resetButton.onclick = () => {
				this.reset();
			};
			container.appendChild(resetButton);
		}

		await make();
		this.hooks.add("update", make);
	}

	displayButton(button) {
		button.innerText = "Calculate Area";
		button.title = "Calculate area [shortcut: 'c']";
	}

	getDescription() {
		const squareMeters = this.getAreaSelectedSquareMeters();
		const squareKilometers = squareMeters / (1000 ** 2);
		return `Area calculation (${squareKilometers.toFixed(2)}km²)`;
	}

	getAreaSelectedSquareMeters() {
		let n = 0;

		for(const x in this.tiles) {
			const tilesX = this.tiles[x];
			for(const y in tilesX) {
				n++;
			}
		}

		return n * (this.context.mapper.unitsToMeters(this.context.pixelsToUnits(tileSize)) ** 2);
	}

	async draw(c, where) {
		c.strokeStyle = "black";

		for(const x in this.tiles) {
			const tilesX = this.tiles[x];
			for(const y in tilesX) {
				const p = (new Vector3(+x, +y, 0)).subtract(this.context.scrollOffset);
				c.strokeRect(p.x, p.y, tileSize, tileSize);
			}
		}

		super.draw(c, where);
	}

	async triggerAtPosition(brushPosition) {
		const absoluteBrushPosition = brushPosition.add(this.context.scrollOffset);
		const radius = this.getRadius();
		const radiusSquared = radius * radius;
		const removing = this.context.isKeyDown("Shift");

		const brushBox = Box3.fromRadius(absoluteBrushPosition, radius).map((v) => v.map((c) => c - c % tileSize));

		const toAdd = [];
		const toRemove = [];

		for(let x = brushBox.a.x; x <= brushBox.b.x; x += tileSize) {
			let tilesX = this.tiles[x];
			if(tilesX === undefined) {
				this.tiles[x] = tilesX = {};
			}
			for(let y = brushBox.a.y; y <= brushBox.b.y; y += tileSize) {
				const vector = new Vector3(x, y, 0);
				if(vector.subtract(absoluteBrushPosition).lengthSquared() < radiusSquared) {
					if(removing) {
						if(tilesX[y]) {
							toRemove.push([x, y]);
						}
					}
					else {
						if(!tilesX[y]) {
							toAdd.push([x, y]);
						}
					}
				}
			}
		}

		if(removing) {
			return new AreaBrushDelete(this.context, {
				brush: this,
				toRemove: toRemove,
			});
		}
		else {
			return new AreaBrushAdd(this.context, {
				brush: this,
				toAdd: toAdd,
			});
		}
	}

	async triggerOnPath(path) {
		const actions = [];
		for(const vertex of path.withBisectedLines(this.getRadius() / 2).vertices()) {
			actions.push(await this.triggerAtPosition(vertex));
		}
		return new BulkAction(this.context, {actions: actions});
	}

	async trigger(drawEvent) {
		const action = await this.triggerOnPath(drawEvent.path.asMostRecent());
		const undoAction = await this.context.performAction(action);
		return undoAction;
	}

	async activate(where) {
		return new DrawEvent(this.context, where);
	}
}

export { AreaBrush };

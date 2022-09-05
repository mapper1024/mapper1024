import { Action, BulkAction, NodeCleanupAction, RemoveAction } from "./index.js";
import { Vector3 } from "../geometry.js";

class DrawPathAction extends Action {
	getPathOnMap() {
		return this.context.canvasPathToMap(this.options.path).asMostRecent().withBisectedLines(this.getRadiusOnMap());
	}

	getRadiusOnMap() {
		return this.context.pixelsToUnits(this.options.radius);
	}

	async perform() {
		const drawEvent = this.options.drawEvent;
		const placedNodes = [];

		const radius = this.getRadiusOnMap();

		// Draw border nodes at a particular travel rotation.
		const drawAtAngle = async (where, angle) => {
			const borderAOffset = new Vector3(Math.cos(angle), -Math.sin(angle), 0).multiplyScalar(radius);
			const borderBOffset = borderAOffset.multiplyScalar(-1);

			const borderAPoint = where.add(borderAOffset);
			const borderA = await this.context.mapper.insertNode(borderAPoint, "point", {
				type: this.options.nodeType,
				radius: 0,
				parent: this.options.parent,
			});

			const borderBPoint = where.add(borderBOffset);
			const borderB = await this.context.mapper.insertNode(borderBPoint, "point", {
				type: this.options.nodeType,
				radius: 0,
				parent: this.options.parent,
			});

			return [borderA, borderB];
		};

		const connectNodes = async (nodesA, nodesB) => {
			const seen = new Set();
			for(const a of nodesA) {
				seen.add(a.id);
				for(const b of nodesB) {
					if(!seen.has(b.id)) {
						await this.context.mapper.backend.createEdge(a.id, b.id);
					}
				}
			}
		};

		const vertices = Array.from(this.getPathOnMap().vertices());

		for(let i = 0; i < vertices.length; i++) {
			const where = vertices[i];
			const wherePixel = this.context.mapPointToCanvas(where);

			const lastState = drawEvent.getLastState();
			const first = lastState === undefined;
			const last = drawEvent.done && i === vertices.length - 1;

			const placedForVertex = [];

			// Calculate
			let dir = Vector3.ZERO;
			let angle = Math.PI / 2;
			let ok = true; // OK to add more nodes, or should we wait instead?
			if(!first) {
				// We've drawn something before, let's find out which way the user is drawing.
				const diff = wherePixel.subtract(lastState.wherePixel);
				if(diff.length() > this.options.radius / 4) {
					// The user has drawn enough, let's go!
					dir = diff.normalize();
					angle = Math.atan2(-dir.y, dir.x) + Math.PI / 2;
				}
				else if(!last) {
					// The user hasn't really moved or stopped drawing, let's not do anything until next time.
					ok = false;
				}
			}

			if(ok) {
				if(last || first) {
					// This is the beginning or end of a stroke, draw all four "sides".
					placedForVertex.push(...(await drawAtAngle(where, 0)));
					placedForVertex.push(...(await drawAtAngle(where, Math.PI / 2)));
				}
				else {
					// We're in the middle of a stroke, just continue the path.
					placedForVertex.push(...(await drawAtAngle(where, angle)));
				}

				placedNodes.push(...placedForVertex);

				// Record drawing event for calculating the full path.
				drawEvent.pushState({
					where: where,
					wherePixel: wherePixel,
					angle: angle,
					borders: placedForVertex,
				});
			}

			// Connect borders across the drawn area.
			await connectNodes(placedForVertex, placedForVertex);

			// Connect edges to the last drawn position.
			if(lastState !== undefined) {
				await connectNodes(placedForVertex, lastState.borders);
			}
		}

		for(const nodeRef of placedNodes) {
			let sum = Vector3.ZERO;
			let count = 0;

			for await (const otherNodeRef of nodeRef.getSelfAndNeighbors()) {
				sum = sum.add(await otherNodeRef.getCenter());
				count += 1;
			}

			const center = sum.divideScalar(count);
			let furthest = center;

			for await (const otherNodeRef of nodeRef.getSelfAndNeighbors()) {
				const point = await otherNodeRef.getCenter();
				if(furthest.subtract(center).lengthSquared() < point.subtract(center).lengthSquared()) {
					furthest = point;
				}
			}

			await nodeRef.setEffectiveCenter(center);
			await nodeRef.setRadius(furthest.subtract(center).length());
		}

		const undoActions = [];

		if(drawEvent.done) {
			if(this.options.undoParent) {
				placedNodes.push(this.options.parent);
			}

			undoActions.push(await this.context.performAction(new NodeCleanupAction(this.context, {nodeRef: this.options.parent, type: this.options.nodeType}), false));
		}

		undoActions.push(new RemoveAction(this.context, {
			nodeRefs: placedNodes,
		}));

		return new BulkAction(this.context, {actions: undoActions});
	}

	empty() {
		return false;
	}
}

export { DrawPathAction };

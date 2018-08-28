/**
 * @author arodic / https://github.com/arodic
 *
 * This class provides events and related interfaces for handling hardware
 * agnostic pointer input from mouse, touchscreen and keyboard.
 * It is inspired by [PointerEvents](https://www.w3.org/TR/pointerevents/).
 *
 * @event contextmenu
 * @event keydown - requires focus
 * @event keyup - requires focus
 * @event wheel
 * @event focus
 * @event blur
 * @event pointerdown
 * @event pointermove
 * @event pointerhover
 * @event pointerup
 */

export class PointerEvents {
	constructor(domElement) {
		if (domElement === undefined || !(domElement instanceof HTMLElement)) {
			console.warn('PointerEvents: domElement is mandatory in constructor!');
			domElement = document;
		}

		this.domElement = domElement;
		this.pointers = new PointerArray(domElement);

		const scope = this;
		let dragging = false;

		function _onContextmenu(event) {
			event.preventDefault();
			scope.dispatchEvent({ type: "contextmenu" });
		}

		function _onMouseDown(event) {
			event.preventDefault();
			if (!dragging) {
				dragging = true;
				domElement.removeEventListener("mousemove", _onMouseHover, false);
				document.addEventListener("mousemove", _onMouseMove, false);
				document.addEventListener("mouseup", _onMouseUp, false);
				scope.domElement.focus();
				scope.pointers.update(event, "pointerdown");
				scope.dispatchEvent(makePointerEvent("pointerdown", scope.pointers));
			}
		}
		function _onMouseMove(event) {
			event.preventDefault();
			scope.pointers.update(event, "pointermove");
			scope.dispatchEvent(makePointerEvent("pointermove", scope.pointers));
		}
		function _onMouseHover(event) {
			scope.pointers.update(event, "pointerhover", true);
			scope.dispatchEvent(makePointerEvent("pointerhover", scope.pointers));
		}
		function _onMouseUp(event) {
			if (event.buttons === 0) {
				dragging = false;
				domElement.addEventListener("mousemove", _onMouseHover, false);
				document.removeEventListener("mousemove", _onMouseMove, false);
				document.removeEventListener("mouseup", _onMouseUp, false);
				scope.pointers.update(event, "pointerup", true);
				scope.dispatchEvent(makePointerEvent("pointerup", scope.pointers));
			}
		}

		function _onTouchDown(event) {
			event.preventDefault();
			scope.domElement.focus();
			scope.pointers.update(event, "pointerdown");
			scope.dispatchEvent(makePointerEvent("pointerdown", scope.pointers));
		}
		function _onTouchMove(event) {
			event.preventDefault();
			scope.pointers.update(event, "pointermove");
			scope.dispatchEvent(makePointerEvent("pointermove", scope.pointers));
		}
		function _onTouchHover(event) {
			scope.pointers.update(event, "pointerhover");
			scope.dispatchEvent(makePointerEvent("pointerhover", scope.pointers));
		}
		function _onTouchUp(event) {
			scope.pointers.update(event, "pointerup");
			scope.dispatchEvent(makePointerEvent("pointerup", scope.pointers));
		}

		function _onKeyDown(event) {
			scope.dispatchEvent({ type: "keydown", keyCode: event.keyCode });
		}
		function _onKeyUp(event) {
			scope.dispatchEvent({ type: "keyup", keyCode: event.keyCode });
		}

		function _onWheel(event) {
			event.preventDefault();
			// TODO: test on multiple platforms/browsers
			// Normalize deltaY due to https://bugzilla.mozilla.org/show_bug.cgi?id=1392460
			const delta = event.deltaY > 0 ? 1 : - 1;
			scope.dispatchEvent({ type: "wheel", delta: delta });
		}

		function _onFocus(event) {
			domElement.addEventListener("blur", _onBlur, false);
			scope.dispatchEvent({ type: "focus" });
		}
		function _onBlur(event) {
			domElement.removeEventListener("blur", _onBlur, false);
			scope.dispatchEvent({ type: "blur" });
		}

		{
			domElement.addEventListener("contextmenu", _onContextmenu, false);
			domElement.addEventListener("mousedown", _onMouseDown, false);
			domElement.addEventListener("mousemove", _onMouseHover, false);
			domElement.addEventListener("touchstart", _onTouchHover, false);
			domElement.addEventListener("touchstart", _onTouchDown, false);
			domElement.addEventListener("touchmove", _onTouchMove, false);
			domElement.addEventListener("touchend", _onTouchUp, false);
			domElement.addEventListener("keydown", _onKeyDown, false);
			domElement.addEventListener("keyup", _onKeyUp, false);
			domElement.addEventListener("wheel", _onWheel, false);
			domElement.addEventListener("focus", _onFocus, false);
		}

		this.dispose = function () {
			domElement.removeEventListener("contextmenu", _onContextmenu, false);
			domElement.removeEventListener("mousedown", _onMouseDown, false);
			domElement.removeEventListener("mousemove", _onMouseHover, false);
			document.removeEventListener("mousemove", _onMouseMove, false);
			document.removeEventListener("mouseup", _onMouseUp, false);
			domElement.removeEventListener("touchstart", _onTouchHover, false);
			domElement.removeEventListener("touchstart", _onTouchDown, false);
			domElement.removeEventListener("touchmove", _onTouchMove, false);
			domElement.removeEventListener("touchend", _onTouchUp, false);
			domElement.removeEventListener("keydown", _onKeyDown, false);
			domElement.removeEventListener("keyup", _onKeyUp, false);
			domElement.removeEventListener("wheel", _onWheel, false);
			domElement.removeEventListener("focus", _onFocus, false);
			domElement.removeEventListener("blur", _onBlur, false);
			delete this._listeners;
		};
	}
	addEventListener(type, listener) {
		this._listeners = this._listeners || {};
		this._listeners[type] = this._listeners[type] || [];
		if (this._listeners[type].indexOf(listener) === -1) {
			this._listeners[type].push(listener);
		}
	}
	hasEventListener(type, listener) {
		if (this._listeners === undefined) return false;
		return this._listeners[type] !== undefined && this._listeners[type].indexOf(listener) !== -1;
	}
	removeEventListener(type, listener) {
		if (this._listeners === undefined) return;
		if (this._listeners[type] !== undefined) {
			var index = this._listeners[type].indexOf(listener);
			if (index !== -1) this._listeners[type].splice(index, 1);
		}
	}
	dispatchEvent(event) {
		if (this._listeners === undefined) return;
		if (this._listeners[event.type] !== undefined) {
			var array = this._listeners[event.type].slice(0);
			for (var i = 0, l = array.length; i < l; i ++) {
				array[i].call(this, event);
			}
		}
	}
}

class Pointer {
	constructor(pointerID, target, type, pointerType) {
		this.pointerID = pointerID;
		this.target = target;
		this.type = type;
		this.pointerType = pointerType;
		this.clientX = 0;
		this.clientY = 0;
		this.x = 0;
		this.y = 0;
		this.startX = 0;
		this.startY = 0;
		this.movementX = 0;
		this.movementY = 0;
		this.distanceX = 0;
		this.distanceY = 0;
		this.button = -1;
		this.buttons = 0;
	}
	clone() {
		const pointer = new Pointer(this.pointerID, this.target, this.type, this.pointerType);
		pointer.clientX = this.clientX;
		pointer.clientY = this.clientY;
		pointer.x = this.x;
		pointer.y = this.y;
		pointer.startX = this.startX;
		pointer.startY = this.startY;
		pointer.movementX = this.movementX;
		pointer.movementXY = this.movementXY;
		pointer.distanceX = this.distanceX;
		pointer.distanceY = this.distanceY;
		pointer.button = this.button;
		pointer.buttons = this.buttons;
		return pointer;
	}
	toRectSpace() {
		const rect = this.target.getBoundingClientRect();
		const pointer = this.clone();
		pointer.clientX = this.clientX / window.innerWidth * 2.0 - 1.0;
		pointer.clientY = this.clientY / window.innerHeight * -2.0 + 1.0;
		pointer.x = (this.x - rect.left) / rect.width * 2.0 - 1.0;
		pointer.y = (this.y - rect.top) / rect.height * -2.0 + 1.0;
		pointer.startX = (this.startX - rect.left) / rect.width * 2.0 - 1.0;
		pointer.startY = (this.startY - rect.top) / rect.height * -2.0 + 1.0;
		pointer.movementX = this.movementX / rect.width * 2.0;
		pointer.movementY = this.movementY / rect.height * -2.0;
		pointer.distanceX = this.distanceX / rect.width * 2.0;
		pointer.distanceY = this.distanceY / rect.height * -2.0;
		return pointer;
	}
	update(previous) {
		this.pointerID = previous.pointerID;
		this.startX = previous.startX;
		this.startY = previous.startY;
		this.movementX = this.x - previous.x;
		this.movementY = this.y - previous.y;
		this.distanceX = this.x - this.startX;
		this.distanceY = this.y - this.startY;
	}
}

class PointerArray extends Array {
	constructor(domElement) {
		super();
		this.target = domElement;
		this.previous = [];
		this.removed = [];
	}
	update(event, type, remove) {

		this.previous.length = 0;
		this.removed.length = 0;

		for (var i = 0; i < this.length; i++) {
			 this.previous.push(this[i]);
		}
		this.length = 0;

		const rect = this.target.getBoundingClientRect();

		let touches = event.touches ? event.touches : [event];
		let pointerType = event.touches ? 'touch' : 'mouse';
		let buttons = event.buttons || 0;

		let id = 0;
		if (!remove) for (let i = 0; i < touches.length; i++) {
			if (isTouchInTarget(touches[i], this.target) || event.touches === undefined) {
				let pointer =  new Pointer(id, this.target, type, pointerType);
				pointer.clientX = touches[i].clientX;
				pointer.clientY = touches[i].clientY;
				pointer.x = touches[i].clientX - rect.x;
				pointer.y = touches[i].clientY - rect.y;
				pointer.startX = touches[i].clientX - rect.x;
				pointer.startY = touches[i].clientY - rect.y;
				pointer.buttons = buttons;
				if (buttons === 1 || buttons === 3 || buttons === 5 || buttons === 7) pointer.button = 1;
				else if (buttons === 2 || buttons === 6) pointer.button = 2;
				else if (buttons === 4) pointer.button = 3;
				pointer.altKey = event.altKey;
				pointer.ctrlKey = event.ctrlKey;
				pointer.metaKey = event.metaKey;
				pointer.shiftKey = event.shiftKey;
				this.push(pointer);
				id++;
			}
		}

		if (!remove) for (let i = 0; i < this.length; i++) {
			if (this.previous.length) {
				let closest = getClosest(this[i], this.previous);
				if (getClosest(closest, this) !== this[i]) closest = null;
				if (closest) {
					this[i].update(closest);
					this.previous.splice(this.previous.indexOf(closest), 1);
				}
			}
		}

		for (let i = this.previous.length; i--;) {
			this.removed.push(this.previous[i]);
			this.previous.splice(i, 1);
		}
	}
}

function makePointerEvent(type, pointers) {
	const event = Object.assign({ type: type }, pointers);
	event.length = pointers.length;
	return event;
}

function isTouchInTarget(event, target) {
	let eventTarget = event.target;
	while (eventTarget) {
		if (eventTarget === target) return true;
		eventTarget = eventTarget.parentElement;
	}
	return false;
}


function getClosest(pointer, pointers) {
	let closestDist = Infinity;
	let closest;
	for (let i = 0; i < pointers.length; i++) {
		let dx = pointer.x - pointers[i].x;
		let dy = pointer.y - pointers[i].y;
		let dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < closestDist) {
			closest = pointers[i];
			closestDist = dist;
		}
	}
	return closest;
}

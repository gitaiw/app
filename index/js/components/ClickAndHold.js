export default class ClickAndHold extends BaseComponent {
	constructor({
		name,
		loadInnerComponents,
		parent,
		element,
	}) {
		super({
			name,
			loadInnerComponents,
			parent,
			element,
			// Component default options
			defaults: {
				activeClass: 'has-click-and-hold',
				ease: 'power1.in',
				duration: 3.6
			},
			// Component inner elements
			innerElements: {
				links: 'a[href]:not(a[href="#"])'
			}
		});

		this._handlers = {
			press: this._onPress.bind(this),
			release: this._onRelease.bind(this),
			start: this._onStart.bind(this),
			update: this._onUpdate.bind(this),
			complete: this._onComplete.bind(this)
		};
		this.pressed = false;
		this.event = {};
		this.tl = {};

		this.setup();
	}

	init() {
		if (typeof this.options.duration === 'number') {
			this.tl = gsap.timeline({
				defaults: {
					duration: this.options.duration,
					ease: typeof this.options.ease === 'string' ? this.options.ease : undefined
				}
			});

			this._setHasClickAndHold(true);
			this._attachEvents();
		}
	}

	destroy() {
		this._detachEvents();

		if (this.tl) {
			this.tl.kill();
		}
	}

	_setHasClickAndHold(enabled = true) {
		this.element.classList.toggle(`${this.options.activeClass}`, enabled);
	}

	_attachEvents() {
		if (this.elements.links.length) {
			this.elements.links.forEach((link) => {
				// Prevent force touch
				link.addEventListener('webkitmouseforcewillbegin', app.hoverEffect.preventDefault);
				link.addEventListener('webkitmouseforcedown', app.hoverEffect.preventDefault);
				link.addEventListener('webkitmouseforceup', app.hoverEffect.preventDefault);
				link.addEventListener('webkitmouseforcechanged', app.hoverEffect.preventDefault);

				link.addEventListener('click', app.hoverEffect.preventDefault);
				link.addEventListener('mousedown', this._handlers.press);
				link.addEventListener('touchstart', this._handlers.press);

				link.addEventListener('mouseup', this._handlers.release);
				link.addEventListener('mouseleave', this._handlers.release);
				link.addEventListener('touchend', this._handlers.release);
			});
		}
	}

	_detachEvents() {
		if (this.elements.links.length) {
			this.elements.links.forEach((link) => {
				// Prevent force touch
				link.removeEventListener('webkitmouseforcewillbegin', app.hoverEffect.preventDefault);
				link.removeEventListener('webkitmouseforcedown', app.hoverEffect.preventDefault);
				link.removeEventListener('webkitmouseforceup', app.hoverEffect.preventDefault);
				link.removeEventListener('webkitmouseforcechanged', app.hoverEffect.preventDefault);

				link.removeEventListener('click', app.hoverEffect.preventDefault);
				link.removeEventListener('mousedown', this._handlers.press);
				link.removeEventListener('touchstart', this._handlers.press);

				link.removeEventListener('mouseup', this._handlers.release);
				link.removeEventListener('mouseleave', this._handlers.release);
				link.removeEventListener('touchend', this._handlers.release);
			});
		}
	}

	_onPress(event) {
		event.preventDefault();

		// Only main mouse button (usually a left-side button)
		if ('button' in event && event.button !== 0) {
			return;
		}

		this.event = event;

		this.pressed = true;

		this.tl
			.clear()
			.to({}, {
				onStart: this._handlers.start,
				onUpdate: this._handlers.update,
				onComplete: this._handlers.complete
			}, '<');
	}

	_onRelease() {
		if (this.pressed) {
			const evt = new CustomEvent('release', {
				detail: {
					component: this,
				}
			});

			this.tl.clear();

			this.element.dispatchEvent(evt);

			this.pressed = false;
		}
	}

	_onStart() {
		const evt = new CustomEvent('press', {
			detail: {
				component: this,
				progress: this.tl.progress()
			}
		});

		this.element.dispatchEvent(evt);
	}

	_onUpdate() {
		const evt = new CustomEvent('progress', {
			detail: {
				component: this,
				progress: this.tl.progress()
			}
		});

		this.element.dispatchEvent(evt);
	}

	_onComplete() {
		const
			clickAndHoldParent = this.event.target.closest(`.${this.options.activeClass}`),
			link = this.event.target.closest('a'),
			evt = new CustomEvent('complete');

		this.element.dispatchEvent(evt);

		if (clickAndHoldParent) {
			this._setHasClickAndHold(false);
		}

		link.removeEventListener('webkitmouseforcewillbegin', app.hoverEffect.preventDefault);
		link.removeEventListener('webkitmouseforcedown', app.hoverEffect.preventDefault);
		link.removeEventListener('webkitmouseforceup', app.hoverEffect.preventDefault);
		link.removeEventListener('webkitmouseforcechanged', app.hoverEffect.preventDefault);

		link.removeEventListener('click', app.hoverEffect.preventDefault);
		link.removeEventListener('mousedown', this._handlers.press);
		link.removeEventListener('touchstart', this._handlers.press);

		link.removeEventListener('mouseup', this._handlers.release);
		link.removeEventListener('mouseleave', this._handlers.release);
		link.removeEventListener('touchend', this._handlers.release);

		link.click();
	}
}

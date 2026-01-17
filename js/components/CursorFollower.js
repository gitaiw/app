export default class CursorFollower extends BaseComponent {
	constructor({
		name,
		loadInnerComponents,
		parent,
		element,
		options
	}) {
		super({
			name,
			loadInnerComponents,
			parent,
			element,
			// External options from app.options.cursorFollower
			defaults: options,
			// Component inner elements
			innerElements: {}
		});
		this._handlers = {
			transitionStart: this._onTransitionStart.bind(this),
			transitionEnd: this._onTransitionEnd.bind(this)
		};

		this.setup();
	}

	init() {
		this._createCursorFollower();
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();
		this.instance.destroy();
	}

	_detachEvents() {
		document.removeEventListener('arts/barba/transition/start', this._handlers.transitionStart);
		document.removeEventListener('arts/barba/transition/end', this._handlers.transitionEnd);
	}

	_attachEvents() {
		document.addEventListener('arts/barba/transition/start', this._handlers.transitionStart);
		document.addEventListener('arts/barba/transition/end', this._handlers.transitionEnd);
	}

	update() {
		this.instance.update();
	}

	_createCursorFollower() {
		this.instance = new ArtsCursorFollower(this.element, this.options);
	}

	_onTransitionStart() {
		this._setLoading(true);
	}

	_onTransitionEnd() {
		gsap.delayedCall(0.3, () => {
			this._setLoading(false);
		});
	}

	_setLoading(loading = true) {
		if (this.instance) {
			if (loading) {
				this.instance.reset();
			} else {
				this.instance.update();
			}

			this.instance.reset();
			this.instance.setLoading(loading);
		}
	}
}

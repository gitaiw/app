export default class Scroll extends BaseComponent {
	constructor({
		name,
		loadInnerComponents,
		parent,
		element,
		options,
	}) {
		super({
			name,
			loadInnerComponents,
			parent,
			element,
			// External options from app.options.smoothScroll
			defaults: options
		});

		this._handlers = {
			click: this._onClick.bind(this),
			animationFrame: this._onAnimationFrame.bind(this),
			animationFrameGSAP: this._onAnimationFrameGSAP.bind(this),
			transitionEnd: this.reset.bind(this),
		};
		this._raf = 0;

		this.instance = null;
		this.setup();
		this._attachAJAXListeners();
	}

	init() {
		this._createVelocityWatcher();
		this._initSmoothScroll();
		this._attachEvents();
	}

	reset() {
		if (this.instance) {
			// this.instance.scroll = 0;
			this.instance.targetScroll = 0;
			this.instance.start();
		}

		this._detachEvents();
		this.element = app.containerEl;
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();

		if (this.instance) {
			this.instance.destroy();

			if (!!this.options.useGSAPRaf) {
				gsap.ticker.remove(this._handlers.animationFrameGSAP);
			} else {
				cancelAnimationFrame(this._raf);
				this._raf = 0;
			}
			this.instance = undefined;
		}
	}

	_initSmoothScroll() {
		const hasSmoothScroll = typeof Lenis !== 'undefined' && app.utilities.isEnabledOption(app.options.smoothScroll) && !this.instance;

		if (hasSmoothScroll) {
			this.instance = new Lenis({
				duration: this.options.duration,
				easing: this.options.easing
			});

			if (!!this.options.useGSAPRaf) {
				gsap.ticker.add(this._handlers.animationFrameGSAP, false, true);
			} else {
				this._raf = requestAnimationFrame(this._handlers.animationFrame);
			}
		}

		this._setSmoothScroll(hasSmoothScroll);
	}

	_setSmoothScroll(enabled = false) {
		if (enabled) {
			document.documentElement.classList.add('has-smooth-scroll');
			document.documentElement.classList.remove('no-smooth-scroll');
		} else {
			document.documentElement.classList.remove('has-smooth-scroll');
			document.documentElement.classList.add('no-smooth-scroll');
		}
	}

	_onAnimationFrame(time) {
		this.instance && this.instance.raf(time);
		requestAnimationFrame(this._handlers.animationFrame);
	}

	_onAnimationFrameGSAP(time, deltaTime, frame) {
		this.instance && this.instance.raf(time * 1000);
	}

	_attachAJAXListeners() {
		document.addEventListener('arts/barba/transition/end', this._handlers.transitionEnd);
	}

	_attachEvents() {
		this.element.addEventListener('click', this._handlers.click);
	}

	_detachEvents() {
		this.element.removeEventListener('click', this._handlers.click);
	}

	_onClick(event) {
		const target = event.target;

		if (target instanceof HTMLElement) {
			const
				link = target.closest('a'),
				anchorTarget = this._getPageElementAnchor(link);

			if (anchorTarget) {
				event.preventDefault();
				app.utilities.scrollTo({
					target: anchorTarget
				});
			} else if (link && link.getAttribute('href') === '#!scroll-down') {
				event.preventDefault();

				let offset;

				const horizontalScrollContainer = link.closest('.has-horizontal-scroll');

				if (horizontalScrollContainer) {
					const hsFirstSection = horizontalScrollContainer.querySelector('.js-horizontal-scroll__section');

					if (hsFirstSection) {
						offset = horizontalScrollContainer.offsetTop + hsFirstSection.offsetWidth;
					} else {
						offset = horizontalScrollContainer.offsetTop + window.innerWidth;
					}

				} else {
					offset = window.innerHeight;
				}

				app.utilities.scrollTo({
					target: offset
				});
			} else if (link && link.getAttribute('href') === '#!scroll-up') {
				event.preventDefault();

				app.utilities.scrollTo({
					target: 0
				});
			}
		}
	}

	_getPageElementAnchor(element) {
		if (!element) {
			return null;
		}

		const href = element.getAttribute('href');

		if (this._isValidAnchor(href)) {
			return this._getAnchorTarget(href);
		}

		return null;
	}

	_isValidAnchor(href) {
		return href && href !== '#' && !href.includes('elementor-action');
	}

	_getAnchorTarget(href) {
		const hashIndex = href.lastIndexOf('#');
		let anchorID;

		if (hashIndex !== -1) {
			anchorID = href.slice(hashIndex + 1);
		}

		if (anchorID) {
			return document.getElementById(anchorID);
		} else {
			return null;
		}
	}

	_createVelocityWatcher() {
		const ID = 'velocityWatcher';

		if (!ScrollTrigger.getById(ID)) {
			ScrollTrigger.create({
				id: 'velocityWatcher',
				start: 0,
				end: () => ScrollTrigger.maxScroll('html'),
			});
		}
	}
}

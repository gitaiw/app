export default class Parallax extends BaseComponent {
	constructor({
		name,
		loadInnerComponents,
		parent,
		element
	}) {
		super({
			name,
			loadInnerComponents,
			parent,
			element,
			// Component default options
			defaults: {
				animateFrom: 'center',
				animateY: 100,
				inner: {
					factor: {
						x: 0,
						y: 0
					},
					translate: {
						from: {
							x: 0,
							y: 0,
						},
						to: {
							x: 0,
							y: 0,
						},
					},
					scale: {
						from: false,
						to: false
					},
					rotate: {
						from: false,
						to: false
					},
					matchMedia: false
				},
				outer: false
			},
			// Component inner elements
			innerElements: {
				outerElement: '.js-parallax__outer',
				innerElement: '.js-parallax__inner'
			}
		});

		this.setup();
	}

	init() {
		if (!this._hasAnimationScene()) {
			this._createParallax();
		}
	}

	destroy() {
		if (this.parallaxInner) {
			this.parallaxInner.destroy();
		}

		if (this.parallaxOuter) {
			this.parallaxOuter.destroy();
		}
	}

	_initAnimations() {
		if (this._hasAnimationScene()) {
			this.prepareAnimation().then(() => {
				this._createParallax();
				this._getRevealTextAnimation();
				this._registerAnimations();
				this._setAnimationReady();
				this._createSTReveal();
			});
		}

		this._createSTScrub();
	}

	_createParallax() {
		if (!!this.options.inner && this.elements.innerElement[0]) {
			this.parallaxInner = new ArtsParallax(this.element, {
				target: 'innerElement',
				outerElementSelector: this.innerSelectors.outerElement,
				innerElementSelector: this.innerSelectors.innerElement,
				factor: this.options.inner.factor,
				translate: this.options.inner.translate,
				scale: this.options.inner.scale,
				rotate: this.options.inner.rotate,
				velocity: this.options.inner.velocity,
				matchMedia: this.options.inner.matchMedia,
				containerAnimation: this.containerAnimation ? () => this.containerAnimation : undefined
			});
		}

		if (!!this.options.outer) {
			this.parallaxOuter = new ArtsParallax(this.elements.outerElement[0] || this.element, {
				target: 'outerElement',
				outerElementSelector: this.innerSelectors.outerElement,
				innerElementSelector: this.innerSelectors.innerElement,
				translate: this.options.outer.translate,
				scale: this.options.outer.scale,
				rotate: this.options.outer.rotate,
				velocity: this.options.outer.velocity,
				matchMedia: this.options.outer.matchMedia,
				containerAnimation: this.containerAnimation ? () => this.containerAnimation : undefined
			});
		}
	}
}

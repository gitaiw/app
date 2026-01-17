export default class Masthead extends BaseComponent {
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
				fixed: false,
			},
			// Component inner elements
			innerElements: {
				fixedWrapper: '.js-masthead__fixed-wrapper',
				fixedFeaturedMedia: '.js-masthead__fixed-featured-media',
				fixedContent: '.js-masthead__fixed-content',
				fixedScrollDown: '.js-masthead__fixed-scroll-down',
				animationMask: '.js-masthead__animation-mask',
				animationScale: '.js-masthead__animation-scale',
				animationFade: '.js-masthead__animation-fade',
			}
		});

		this.setup();
	}

	init() {
		if (!!this.options.fixed) {
			const mq = typeof this.options.fixed.matchMedia === 'string' ? this.options.fixed.matchMedia : 'all';
			const AJAX = app.componentsManager.getComponentByName('AJAX');

			this.mm = gsap.matchMedia();

			if (AJAX && AJAX.running) {
				document.addEventListener('arts/barba/transition/end', () => {
					this.mm.add(mq, () => {
						this._createFixedScene();
					});
				}, {
					once: true
				});
			} else {
				this.mm.add(mq, () => {
					this._createFixedScene();
				});
			}
		}
	}

	destroy() {
		if (this.fixedScene && typeof this.fixedScene.kill === 'function') {
			this.fixedScene.kill();
		}

		if (this.fixedAnimation && typeof this.fixedAnimation.kill === 'function') {
			this.fixedAnimation.kill();
		}

		if (this.mm && typeof this.mm.kill === 'function') {
			this.mm.kill();
		}
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => resolve(true)
			});

			if (this.elements.animationFade.length) {
				this.elements.animationFade.forEach((el) => {
					tl.set(el, {
						autoAlpha: 0
					});
				});
			}

			if (this.elements.animationMask.length) {
				this.elements.animationMask.forEach((el) => {
					if (this._shouldAnimateMask(el)) {
						tl.hideMask(el, {
							clearProps: '',
							duration: 0,
							animateTo: 'top',
							scaleInner: false
						});
					}
				});
			}

			if (this.elements.animationScale.length) {
				tl.set(this.elements.animationScale, {
					scale: 0,
					transformOrigin: 'center center'
				});
			}
		});
	}

	getRevealAnimation() {
		const tl = gsap.timeline({
			paused: true
		});

		if (this.elements.animationMask.length) {
			this.elements.animationMask.forEach((el, index) => {
				if (this._shouldAnimateMask(el)) {
					tl.animateMask(el, {
						animateFrom: 'top',
						duration: 1.2,
						ease: 'expo.inOut',
						scaleInner: '.js-masthead__animation-mask-wrapper',
						scale: 1.1
					}, '<');
				}
			});
		}

		if (this.elements.animationFade.length) {
			this.elements.animationFade.forEach((el, index) => {
				tl.to(el, {
					autoAlpha: 1,
					duration: 1.2,
					clearProps: 'opacity,visibility',
					ease: 'power3.out'
				}, '<');
			});
		}

		if (this.elements.animationScale.length) {
			this.elements.animationScale.forEach((el, index) => {
				tl.animateScale(el, {
					ease: 'power3.out',
					duration: 1.2,
					animateFrom: 'center'
				}, '<');
			});
		}

		return tl;
	}

	_shouldAnimateMask(el) {
		const AJAXRef = app.componentsManager.getComponentByName('AJAX');

		if (AJAXRef) {
			const runningSeamlessTransition = !!AJAXRef.runningSeamlessTransition;

			if (runningSeamlessTransition && (el.closest('.js-ajax-transition-element'))) {
				return false;
			} else {
				return true;
			}
		} else {
			return true;
		}
	}

	_createFixedScene() {
		const
			animation = this._getFixedAnimation(),
			pageFooter = document.getElementById('page-footer'),
			endTrigger = pageFooter ? pageFooter : undefined,
			end = pageFooter ? `top bottom` : () => this._getFixedScrollingDistance();

		this.fixedScene = ScrollTrigger.create({
			trigger: this.element,
			start: `top top`,
			end,
			endTrigger,
			pin: true,
			pinSpacing: false,
			invalidateOnRefresh: true,
			scrub: true
		});

		this.fixedAnimation = ScrollTrigger.create({
			trigger: document.documentElement,
			start: () => `top top`,
			end: () => `${this.element.offsetTop + this.element.offsetHeight * 1.5} bottom`,
			animation,
			invalidateOnRefresh: true,
			scrub: true
		});
	}

	_getFixedAnimation() {
		const tl = gsap.timeline({
			paused: true
		}),
			y = typeof this.options.fixed.offset === 'string' ? `${this.options.fixed.offset}` : '0%',
			yNegative = typeof this.options.fixed.offset === 'string' ? `-${this.options.fixed.offset}` : '0%';

		if (this.elements.fixedScrollDown[0]) {
			tl.fromTo(this.elements.fixedScrollDown[0], {
				autoAlpha: 1
			}, {
				autoAlpha: 0
			}, 'start');
		}

		if (this.elements.fixedContent[0]) {
			tl.fromTo(this.elements.fixedContent[0], {
				autoAlpha: 1,
			}, {
				autoAlpha: 0
			}, 'start');
		}

		if (this.elements.fixedWrapper[0]) {
			tl.fromTo(this.elements.fixedWrapper[0], {
				y: '0%'
			}, {
				y: yNegative
			}, 'start');
		}

		if (this.elements.fixedFeaturedMedia[0]) {
			const
				scale = typeof this.options.fixed.scale === 'number' ? this.options.fixed.scale : 1,
				autoAlpha = typeof this.options.fixed.opacity === 'number' ? this.options.fixed.opacity : 0,
				media = this.elements.fixedFeaturedMedia[0].querySelectorAll('img, video');

			tl.fromTo(media || this.elements.fixedFeaturedMedia[0], {
				y: '0%',
				scale: 1,
				autoAlpha: 1,
			}, {
				y,
				scale,
				autoAlpha,
				transformOrigin: 'center center'
			}, 'start');
		}

		return tl;
	}

	_getFixedScrollingDistance() {
		return Math.max(
			document.body.scrollHeight, document.documentElement.scrollHeight,
			document.body.offsetHeight, document.documentElement.offsetHeight,
			document.body.clientHeight, document.documentElement.clientHeight
		) - window.innerHeight;
	}
}

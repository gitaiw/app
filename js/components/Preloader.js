export default class Preloader extends BaseComponent {
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
			// External options from app.options.preloader
			defaults: options,
			// Component inner elements
			innerElements: {
				circle: '.js-preloader__circle',
				wrapper: '.js-preloader__wrapper',
				wrapperCounter: '.js-preloader__wrapper-counter',
				wrapperImagesOuter: '.js-preloader__wrapper-images-outer',
				wrappersImages: '.js-preloader__wrapper-image',
				images: '.js-preloader__image',
				contentLoaded: '.js-preloader__content-loaded',
				contentLoading: '.js-preloader__content-loading',
				heading: '.js-preloader__heading',
				counterEnd: '.js-preloader__counter-end'
			},
		});

		this._handlers = {
			start: this._onStart.bind(this),
			load: this._onLoad.bind(this),
			finishLoading: this._onFinishLoading.bind(this)
		};

		this.setup();
	}

	setup() {
		this.tl = gsap.timeline();
		this.loaded = new Promise((resolve) => {
			this._setLoaded = resolve;
		});
		this.finished = new Promise((resolve) => {
			this._setFinished = resolve;
		});
		this.speed = 1;

		document.fonts.ready
			.then(() => this.mount())
			.then(() => {
				this.init();
				this._initAnimations();

				// Set component ready on the next tick
				gsap.ticker.add(this._setReady.bind(this), true, false);
			});
	}

	init() {
		this.splitCounterRef = this._getInnerComponentByName('SplitCounter');

		this._animateLoading();
		this._setTimeScale();
	}

	destroy() {
		if (this.tl && typeof this.tl.kill === 'function') {
			this.tl.kill()
		}
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => {
					resolve(true);
				}
			});

			if (this.elements.images.length) {
				tl.hideMask(this.elements.images, {
					clearProps: '',
					duration: 0,
					animateTo: 'bottom',
					scaleInner: 'img,video',
					scale: 1.1
				});
			}

			if (this.elements.circle.length) {
				tl.set(this.elements.circle, {
					transformOrigin: 'center center'
				});
			}

			if (this.elements.wrappersImages.length) {
				tl.set(this.elements.wrappersImages, {
					rotation: '-6deg',
					transformOrigin: 'center center'
				});
			}

			if (this.elements.counterEnd.length) {
				tl.set(this.elements.counterEnd, {
					y: '100%'
				});
			}
		});
	}

	_animateLoading() {
		// Animate in "loading" content
		if (this.elements.contentLoading.length) {
			this.tl.animateLines(this.elements.contentLoading);
		}

		// Prepare main container offset
		this.tl.set(app.containerEl, {
			// y: '10vh'
		});

		// Animate steps progress
		if (this.elements.circle.length) {
			if (typeof this.options.loadingSteps === 'object') {
				this.options.loadingSteps.forEach((step, index) => {
					const align = index === 0 ? '<' : undefined;

					if (index === this.options.loadingSteps.length - 1) {
						app.loaded.then(() => {
							this.tl.to(this.elements.circle, {
								duration: 1,
								// onStart: ,
								onStart: () => {
									this._onProgress(step[0], step[1]);
									this._setFinished();
								}
							}, align);
						});
					} else {
						this.tl.to(this.elements.circle, {
							duration: 1,
							onStart: this._onProgress.bind(this, step[0], step[1]),
						}, align);
					}
				});
			} else {
				app.loaded.then(() => {
					this.tl.to(this.elements.circle, {
						duration: 1,
						onStart: this._onProgress.bind(this, 100, 100)
					});
				});
			}
		} else {
			app.loaded.then(() => this._setFinished());
		}

		Promise.all([
			app.loaded,
			this.finished
		]).then(this._handlers.finishLoading);
	}

	_onFinishLoading() {
		const finalOffset = typeof this.options.finalOffset === 'string' || typeof this.options.finalOffset === 'number' ? this.options.finalOffset : undefined;

		if (this.elements.counterEnd.length) {
			// Animate in
			this.tl.to(this.elements.counterEnd, {
				y: '0%',
				duration: 0.6,
				ease: 'expo.inOut'
			}, '<');

			// Animate out
			this.tl.to(this.elements.counterEnd, {
				y: '-100%',
				duration: 0.6,
				ease: 'expo.inOut'
			});
		}

		if (this.elements.wrapperCounter.length) {
			this.tl.to(this.elements.wrapperCounter, {
				borderColor: 'transparent',
				duration: 0.6
				// autoAlpha: 0,
			}, '<');
		}

		// Animate out circle drawing
		if (this.elements.circle.length) {
			const align = !this.splitCounterRef ? undefined : '<';

			let rotation = 180;

			if (typeof this.options.finalRotation === 'number') {
				rotation = this.options.finalRotation;
			}

			this.tl.to(this.elements.circle, {
				duration: 1.2,
				ease: 'expo.inOut',
				drawSVG: '100% 100%',
				rotation,
				transformOrigin: 'center center'
			}, align);
		}

		// Animate out "loading" content
		if (this.elements.contentLoading.length) {
			this.tl.hideLines(this.elements.contentLoading, {
				duration: 1.2,
				ease: 'expo.out',
			}, '<');
		}

		if (this.elements.wrappersImages.length) {
			this.tl.to(this.elements.wrappersImages, {
				transformOrigin: 'center center',
				rotation: '0deg',
				duration: 2.4,
				// overwrite: 'auto'
			}, '<50%');
		}

		if (this.elements.images.length) {
			this.elements.images.forEach((el, index) => {
				this.tl.animateMask(el, {
					animateFrom: 'bottom',
					duration: 1.2,
					ease: 'expo.inOut',
					// stagger: 0.2,
					scale: 1.1
				}, index === 0 ? '<' : '<0.2');
			});
		}

		// Animate in "heading"
		if (this.elements.heading.length) {
			this.tl.animateChars(this.elements.heading, {
				duration: 1.2,
				ease: 'expo.out',
				stagger: {
					amount: 0.3,
					from: 'end'
				}
			}, '<50%');
		}

		// Animate in "loaded" content
		if (this.elements.contentLoaded.length) {
			this.tl.animateLines(this.elements.contentLoaded, {
				duration: 1.2,
				ease: 'expo.out',
			}, '<50%');
		}

		// Delay before "out" animation
		if (typeof this.options.finalDelay === 'number') {
			this.tl.to({}, {
				duration: this.options.finalDelay
			});
		}

		// Animate out "heading"
		if (this.elements.heading.length) {
			this.tl.hideChars(this.elements.heading, {
				duration: 1.2,
				y: '-102%',
				ease: 'expo.in',
				stagger: {
					amount: 0.3,
					from: 'start'
				}
			}, '<50%');
		}

		// Animate out "loaded" content
		if (this.elements.contentLoaded.length) {
			this.tl.hideLines(this.elements.contentLoaded, {
				duration: 1.2,
				ease: 'expo.in',
			}, '<');
		}

		if (this.elements.wrapperImagesOuter.length) {
			this.tl.hideMask(this.elements.wrapperImagesOuter, {
				animateTo: 'top',
				duration: 1.2,
				ease: 'expo.in',
				clearProps: ''
			}, '<');
		}

		this.tl
			.hideCurtain(this.element, {
				duration: 1.2,
				animateTo: 'top',
				ease: 'expo.out',
				onComplete: () => {
					gsap.set(this.element, {
						display: 'none'
					});
				}
			})
			.to(app.containerEl, {
				duration: 1.2,
				ease: 'expo.out',
				y: '0vh',
				clearProps: 'all',
			}, '<')
			.add(this._handlers.load, finalOffset);
	}

	_setTimeScale() {
		this.speed = app.utilities.getTimeScaleByKey('preloader');

		this.tl.timeScale(this.speed);

		if (this.splitCounterRef) {
			this.splitCounterRef.tl.timeScale(this.speed);
		}
	}

	_updateCounter(number) {
		if (this.splitCounterRef) {
			this.splitCounterRef.current = number;
		}
	}

	_onStart() {

	}

	_onLoad() {
		if (typeof this.options.toggleLoadClass === 'string') {
			this.element.classList.add(this.options.toggleLoadClass);
		}

		this._setLoaded();
	}

	_onProgress(startValue, endValue) {
		let
			number,
			loadingRotation = 1,
			duration = 0.6 / this.speed;

		if (startValue === 100 && endValue === 100) {
			number = 100;
		} else {
			number = gsap.utils.random(startValue, endValue, 1);
		}

		if (typeof this.options.loadingRotation === 'number') {
			loadingRotation = this.options.loadingRotation;
		}

		gsap.to(this.elements.circle, {
			duration,
			drawSVG: `${number}% 0%`,
			ease: 'expo.inOut',
			rotation: number / 100 * loadingRotation
		});

		this._updateCounter(number === 100 ? null : number);
	}

	_setLoaded() { }

	_setFinished() { }
}

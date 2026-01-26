class SliderFullpageBase extends BaseComponent {
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
			defaults: {
				webGL: {
					enabled: false,
					watchScroll: 'auto',
					vertices: 16,
					transitionEffect: 3
				},
				textTransitionDirection: 'auto',
				preventScroll: false,
				mouse: true,
				keyboard: true,
				controls: true,
				loop: true,
				autoplay: 6,
				scaleInner: 1.0,
				scaleOuter: 1.0,
				shapeSize: 57.5,
				shapeSizeTransition: 17.5,
				transitionDuration: 1.2,
				direction: 'horizontal',
				itemIdAttribute: 'data-post-id'
			},
			innerElements: {
				canvasWrapper: '.canvas-wrapper',
				sections: '.js-slider-fullpage__section',
				masksOuter: '.js-slider-fullpage__mask-outer',
				masksInner: '.js-slider-fullpage__mask-inner',
				buttons: '.js-slider-fullpage__wrapper-button',
				subheadings: '.js-slider-fullpage__wrapper-subheading',
				headings: '.js-slider-fullpage__wrapper-heading',
				texts: '.js-slider-fullpage__wrapper-text',
				overlays: '.js-slider-fullpage__overlay',
				circles: '.slider-dots__dot circle',
				dots: '.slider-dots',
				controlPrev: '[data-arts-fullpage-slider-arrow="prev"]',
				controlNext: '[data-arts-fullpage-slider-arrow="next"]',
				indicators: '[data-arts-fullpage-slider-indicator]',
				arrows: '.slider-arrow',
				arrowsInner: '.slider-arrow__inner',
				categories: '.slider-categories',
				categoriesInner: '.slider-categories__inner',
				categoriesItems: '.slider-categories__item',
				progress: '.button-progress'
			}
		});

		this._handlers = {
			autoplayStart: this._onAutoplayStart.bind(this),
			autoplayStop: this._onAutoplayStop.bind(this),
			autoplayPause: this._onAutoplayPause.bind(this),
			autoplayResume: this._onAutoplayResume.bind(this),
			sectionChange: this._onSectionChange.bind(this),
			visibleUpdate: this._onVisibleUpdate.bind(this),
			animationOut: this._onAnimationOut.bind(this),
			clickAndHoldPress: this._onClickAndHoldPress.bind(this),
			clickAndHoldProgress: this._onClickAndHoldProgress.bind(this),
			clickAndHoldRelease: this._onClickAndHoldRelease.bind(this),
			resize: app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime()),
			ready: this._onReady.bind(this),
			transitionStart: this._onTransitionStart.bind(this),
			transitionEnd: this._onTransitionEnd.bind(this)
		};

		this.dotsTL = gsap.timeline();
		this.delayedClickTL = gsap.timeline();

		this.setup();
	}

	init() {
		const options = {
			interaction: {
				observer: {
					wheelSpeed: -0.5,
					tolerance: 50,
					preventDefault: this.options.preventScroll
				},
				wheel: this.options.mouse,
				touch: true,
				drag: false
			},
			keyboard: this.options.keyboard,
			controls: this.options.controls,
			animation: false,
			direction: this.options.direction,
			loop: this.options.loop,
			autoplay: typeof this.options.autoplay === 'number' ? {
				autoInit: false,
				duration: this.options.autoplay
			} : false,
			sectionElementsSelector: this.innerSelectors.sections,
			controlsPrevSelector: this.innerSelectors.controlPrev,
			controlsNextSelector: this.innerSelectors.controlNext,
			indicatorsSelector: this.innerSelectors.indicators,
			matchMedia: false,
			animationOut: this._handlers.animationOut
		};

		this.updateRef('preloaderRef', 'Preloader');
		this.fullpageSlider = new ArtsFullpageSlider(this.element, options);
		this.fullpageSlider.update();
		this.elementsFirstSlide = this._getElementsFirstSlide();
		this.textTransitionDirection = this._getTextTransitionDirection();

		this._setSlides();

		if (this.elements.categories[0] && this.elements.categoriesInner[0] && this.elements.categoriesItems.length) {
			this._setCategories();
		}

		this._setDots();

		if (this._isWebGLEnabled()) {
			if (this.stReveal && typeof this.stReveal.animation) {
				this.stReveal.animation.pause();
			}

			this._toggleInteraction(false);
			this.setLoading(true);

			app.componentsManager.load({
				properties: app.components['CurtainsBase'],
			}).then((module) => {
				this._initCurtains(module);
				this._attachEvents();
				this.setLoading(false);
			});
		} else {
			if (!!this.options.autoplay && !this._hasAnimationScene()) {
				this.fullpageSlider.autoplay.init();
			}

			this._attachEvents();
		}
	}

	update() {
		if (this.fullpageSlider) {
			this.fullpageSlider.update();
		}
	}

	destroy() {
		this._detachEvents();
		this.fullpageSlider.destroy();

		document.addEventListener('arts/barba/transition/end', this._handlers.transitionEnd, {
			once: true
		});
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => {
					resolve(true);
				}
			});

			if (this.elements.dots.length) {
				tl.set(this.elements.dots, {
					autoAlpha: 0,
					// y: 50
				});
			}

			if (this.elements.arrows.length) {
				tl.set(this.elements.arrows, {
					autoAlpha: 0
				});
			}

			if (this.elements.arrowsInner[0]) {
				tl.set(this.elements.arrowsInner[0], {
					autoAlpha: 0,
					x: -50
				});
			}

			if (this.elements.arrowsInner[1]) {
				tl.set(this.elements.arrowsInner[1], {
					autoAlpha: 0,
					x: 50
				});
			}
		});
	}

	_attachEvents() {
		if (!!this.options.autoplay) {
			this.fullpageSlider
				.on('autoplayStart', this._handlers.autoplayStart)
				.on('autoplayStop', this._handlers.autoplayStop)
				.on('autoplayPause', this._handlers.autoplayPause)
				.on('autoplayResume', this._handlers.autoplayResume);

			document.addEventListener('arts/barba/transition/start', this._handlers.transitionStart, {
				once: true
			});
		}

		this.fullpageSlider.on('sectionChange', this._handlers.sectionChange);

		if (!!this.options.webGL) {
			this.element.addEventListener('click', this._handlers.click);
			this.fullpageSlider.on('visibleUpdate', this._handlers.visibleUpdate);


			app.utilities.attachResponsiveResize({
				callback: this._handlers.resize,
				immediateCall: false
			});
		}

		this._attachClickAndHoldEvents();
	}

	_attachClickAndHoldEvents() {
		this.components
			.filter((component) => component.name === 'ClickAndHold')
			.forEach((component) => {
				component.element.addEventListener('press', this._handlers.clickAndHoldPress);
				component.element.addEventListener('progress', this._handlers.clickAndHoldProgress);
				component.element.addEventListener('release', this._handlers.clickAndHoldRelease);
			});
	}

	_detachEvents() {
		if (!!this.options.autoplay) {
			this.fullpageSlider.off('autoplayStart', this._handlers.autoplayStart);
			this.fullpageSlider.off('autoplayStop', this._handlers.autoplayStop);
		}

		this.fullpageSlider.off('sectionChange', this._handlers.sectionChange);

		if (!!this.options.webGL) {
			this.fullpageSlider.off('visibleUpdate', this._handlers.visibleUpdate);
		}

		this._detachClickAndHoldEvents();
	}

	_detachClickAndHoldEvents() {
		this.components
			.filter((component) => component.name === 'ClickAndHold')
			.forEach((component) => {
				component.element.removeEventListener('press', this._handlers.clickAndHoldPress);
				component.element.removeEventListener('progress', this._handlers.clickAndHoldProgress);
				component.element.removeEventListener('release', this._handlers.clickAndHoldRelease);
			});
	}

	_toggleInteractivity(enabled = true) {
		if (this.fullpageSlider) {
			if (enabled) {
				this.fullpageSlider.interaction.enable();
			} else {
				this.fullpageSlider.interaction.disable();
			}
		}
	}

	_getElementsFirstSlide() {
		const result = {};

		for (const key in this.elements) {
			const elements = [...this.elements[key]];

			elements.forEach((el) => {
				if (this.elements.sections[0].contains(el)) {
					if (Object.hasOwnProperty.call(result, key)) {
						result[key].push(el);
					} else {
						result[key] = [el];
					}
				}
			});
		}
		return result;
	}

	_lockInteraction(lock = false) {
		this.element.classList.toggle('locked', lock);
	}

	_toggleInteraction(enabled = true) {
		this.element.classList.toggle('pointer-events-none', !enabled);
	}

	_setSlides() {
		const hasAnimationScene = this._hasAnimationScene();

		if (!this._isWebGLEnabled()) {
			this._setSlidesOpacity();
			this._setMasks(hasAnimationScene);
		}

		this._setContent(hasAnimationScene);
	}

	_setSlidesOpacity() {
		this.elements.sections.forEach((el, index) => {
			gsap.set(el, {
				autoAlpha: index === 0 ? 1 : 0
			});
		});
	}

	_setMasks(hasAnimationScene) {
		this.elements.masksOuter.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.set(el, {
					scale: this.options.scaleOuter,
					transformOrigin: 'center center'
				});
			} else {
				gsap.set(el, {
					scale: 1,
					transformOrigin: 'center center'
				});
			}
		});

		this.elements.masksInner.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.set(el, {
					scale: this.options.scaleInner,
					transformOrigin: 'center center'
				});
			} else {
				gsap.set(el, {
					scale: 1,
					transformOrigin: 'center center'
				});
			}
		});
	}

	_setContent(hasAnimationScene) {
		this.elements.overlays.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.set(el, {
					autoAlpha: 1
				});
			} else {
				gsap.set(el, {
					autoAlpha: 0
				});
			}
		});

		this.elements.subheadings.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.effects.animateLines(el, {
					duration: 0,
					stagger: false
				});
			} else {
				gsap.effects.hideLines(el, {
					duration: 0,
					y: '102%',
					stagger: false
				});
			}
		});

		this.elements.headings.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.effects.animateChars(el, {
					duration: 0,
					stagger: false
				});
			} else {
				const
					vars = {
						duration: 0,
						stagger: false
					};

				if (this.textTransitionDirection === 'horizontal') {
					Object.assign(vars, {
						x: '102%',
						y: false
					});
				} else {
					Object.assign(vars, {
						x: false,
						y: '102%'
					});
				}

				gsap.effects.hideChars(el, vars);
			}
		});

		this.elements.texts.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.effects.animateLines(el, {
					duration: 0,
					stagger: false
				});
			} else {
				gsap.effects.hideLines(el, {
					duration: 0,
					y: '102%',
					stagger: 0
				});
			}
		});

		this.elements.buttons.forEach((el, index) => {
			if (index === 0 && !hasAnimationScene) {
				gsap.set(el, {
					autoAlpha: 1
				});
			} else {
				gsap.set(el, {
					autoAlpha: 0
				});
			}
		});
	}

	_setCategories() {
		let
			maxWidth = 0,
			maxHeight = 0;

		this.elements.categoriesItems.forEach((el) => {
			const rect = el.getBoundingClientRect();

			if (rect.width > maxWidth) {
				maxWidth = rect.width;
			}

			if (rect.height > maxHeight) {
				maxHeight = rect.height;
			}
		});

		gsap.set(this.elements.categoriesInner[0], {
			width: maxWidth * 1.2,
			height: maxHeight
		});

		gsap.set(this.elements.categoriesItems, {
			position: 'absolute',
			top: 0,
			left: 0,
			transitionDelay: this.options.transitionDuration / 2
		});
	}

	_onAutoplayStart() {
		this.dotsTL.play();
		this._animateDot({
			toIndex: this.fullpageSlider.currentIndex
		});
	}

	_onAutoplayStop() {
	}

	_onAutoplayPause() {
		this.dotsTL.pause();
	}

	_onAutoplayResume() {
		this.dotsTL.play();
	}

	_onSectionChange() {
		this._animateDot({
			fromIndex: this.fullpageSlider.prevIndex,
			toIndex: this.options.autoplay ? undefined : this.fullpageSlider.currentIndex
		});
	}

	_onTransitionStart() {
		if (!!this.options.autoplay) {
			this._handlers.autoplayPause();
			this.fullpageSlider.autoplay.disable();
		}

		this._toggleInteractivity(false);
	}

	_onTransitionEnd() {
		if (this.curtains) {
			this.curtains.destroy();
		}
	}

	_setDots() {
		gsap.set(this.elements.circles, {
			rotate: 0,
			transformOrigin: 'center center',
			drawSVG: '0% 0%'
		});

		// Initial set for 1st slide dot
		if (!this.options.autoplay) {
			gsap.set(this.elements.circles[0], {
				transformOrigin: 'center center',
				drawSVG: '0% 100%'
			});
		}
	}

	_animateDot({
		fromIndex,
		toIndex
	}) {
		this.dotsTL.clear();

		let duration = this.options.transitionDuration * 2;
		const hasAutoplay = typeof this.options.autoplay === 'number';

		if (hasAutoplay) {
			duration = this.options.autoplay;
		} else {
			this.dotsTL.play();
		}

		if (typeof fromIndex === 'number') {
			this.dotsTL.to(this.elements.circles, {
				duration: this.options.transitionDuration / 2,
				rotate: 180,
				transformOrigin: 'center center',
				drawSVG: '100% 100%',
				ease: 'power3.inOut'
			}, 'start');
		}

		if (typeof toIndex === 'number') {
			this.dotsTL.fromTo(this.elements.circles[toIndex], {
				rotate: 0,
				transformOrigin: 'center center',
				drawSVG: '0% 0%',
			}, {
				rotate: 180,
				transformOrigin: 'center center',
				duration,
				drawSVG: '0% 100%',
				ease: hasAutoplay ? 'none' : 'power3.inOut',
			}, 'start');
		}
	}

	_setSection(target, visible = true) {
		const tl = gsap.timeline();

		if (target) {
			tl.set(target, {
				autoAlpha: visible ? 1 : 0
			});
		}

		return tl;
	}

	_onClickAndHoldPress(event) {
		const
			{ component } = event.detail,
			{ duration, ease } = component.tl.vars.defaults,
			hasAutoplay = typeof this.options.autoplay === 'number';

		if (hasAutoplay) {
			this._handlers.autoplayPause();
			this.fullpageSlider.autoplay.disable();
			this.savedDotsTLProgress = this.dotsTL.progress();
		}

		this._toggleInteractivity(false);

		component.tl.add(this._animateClickAndHold({ duration, ease, direction: 'in' }), '<');

		if (this.curtains && this.curtains.instance) {
			component.tl.add(this._animateClickAndHoldWebGL({ duration, ease, direction: 'in' }), '<');
		}
	}

	_onClickAndHoldProgress(event) {
		if (typeof this.savedDotsTLProgress === 'number') {
			const { progress } = event.detail;

			if (progress > this.savedDotsTLProgress) {
				this.dotsTL.progress(progress);
			}
		}
	}

	_onClickAndHoldRelease(event) {
		const
			{ component } = event.detail,
			ease = 'power3.out',
			duration = 0.4,
			hasAutoplay = typeof this.options.autoplay === 'number';

		if (hasAutoplay) {
			this._handlers.autoplayResume();
			this.fullpageSlider.autoplay.enable();
		}

		this._toggleInteractivity(true);

		component.tl.add(this._animateClickAndHold({ duration, ease, direction: 'out' }), '<');

		if (this.curtains && this.curtains.instance) {
			component.tl.add(this._animateClickAndHoldWebGL({ duration, ease, direction: 'out' }), '<');
		}
	}

	_onAnimationOut(currentSection, targetSection, direction) {
		const
			currentMaskOuter = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-background'),
			currentMaskInner = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-background-mask'),
			currentSubheading = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-subheading'),
			currentHeading = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-heading'),
			currentText = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-text'),
			currentButton = currentSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-button'),
			currentOverlay = currentSection.querySelectorAll('.slider-fullpage-backgrounds__overlay'),

			nextMaskOuter = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-background'),
			nextMaskInner = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-background-mask'),
			nextSubheading = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-subheading'),
			nextHeading = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-heading'),
			nextText = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-text'),
			nextButton = targetSection.querySelectorAll('.slider-fullpage-backgrounds__wrapper-button'),
			nextOverlay = targetSection.querySelectorAll('.slider-fullpage-backgrounds__overlay');

		const args = {
			current: {
				section: currentSection,
				maskOuter: currentMaskOuter,
				maskInner: currentMaskInner,
				subheading: currentSubheading,
				heading: currentHeading,
				text: currentText,
				button: currentButton,
				overlay: currentOverlay,
			},
			target: {
				section: targetSection,
				maskOuter: nextMaskOuter,
				maskInner: nextMaskInner,
				subheading: nextSubheading,
				heading: nextHeading,
				text: nextText,
				button: nextButton,
				overlay: nextOverlay
			},
			direction
		};

		if (this._isWebGLEnabled()) {
			return this._getTimelineTransitionWebGL(args);
		} else {
			return this._getTimelineTransition(args);
		}
	}

	_animateClickAndHold({ duration, ease, direction = 'in' }) {
		const
			tl = gsap.timeline({
				defaults: {
					duration,
					ease
				}
			}),
			isDirectionIn = direction === 'in',
			currentIndex = this.fullpageSlider.currentIndex,
			progressButton = this.elements.progress[currentIndex];

		if (this.elements.masksOuter[currentIndex]) {
			const vars = {
				transformOrigin: 'center center',
				scale: isDirectionIn ? 1 : this.options.scaleOuter,
				'--shape-size': isDirectionIn ? 100 : this.options.shapeSize,
			};

			tl.to(this.elements.masksOuter[currentIndex], vars, '<');
		}

		if (this.elements.masksInner[currentIndex]) {
			const vars = {
				transformOrigin: 'center center',
				scale: isDirectionIn ? 1 : this.options.scaleInner,
			};

			tl.to(this.elements.masksInner[currentIndex], vars, '<');
		}

		if (this.elements.overlays[currentIndex]) {
			const vars = {
				autoAlpha: isDirectionIn ? 0 : 1,
			};

			tl.to(this.elements.overlays[currentIndex], vars, '<');
		}

		if (progressButton) {
			const
				animatingClass = 'button-progress_animating',
				labelHold = progressButton.querySelector('.button-progress__hold'),
				labelNormal = progressButton.querySelector('.button-progress__normal'),
				circle = progressButton.querySelector('circle');

			if (labelHold) {
				const vars = {
					duration: 0.2,
					autoAlpha: isDirectionIn ? 1 : 0,
					y: isDirectionIn ? '0%' : '-100%'
				};

				tl.to(labelHold, vars, '<');
			}

			if (labelNormal) {
				const vars = {
					duration: 0.2,
					autoAlpha: isDirectionIn ? 0 : 1,
					y: isDirectionIn ? '100%' : '0%'
				};

				tl.to(labelNormal, vars, '<');
			}

			if (circle) {
				const vars = {
					transformOrigin: 'center center',
					rotate: isDirectionIn ? 180 : 0,
					drawSVG: isDirectionIn ? '0% 100%' : '0% 0%',
				};

				tl.to(circle, vars, '<');
			}

			if (isDirectionIn) {
				progressButton.classList.add(animatingClass);
			} else {
				tl.add(() => progressButton.classList.remove(animatingClass));
			}
		}

		return tl;
	}

	_animateSlideContentOut(duration = this.options.transitionDuration, direction = 'next', {
		subheading,
		heading,
		text,
		button,
		overlay
	}) {
		const
			ease = 'expo.out',
			tl = gsap.timeline(),
			isNextDirection = direction === 'next',
			varsCharsAnimation = {
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 3
				}
			};

		if (this.textTransitionDirection === 'horizontal') {
			Object.assign(varsCharsAnimation, {
				x: isNextDirection ? '-102%' : '102%',
				y: false
			});
		} else {
			Object.assign(varsCharsAnimation, {
				x: false,
				y: isNextDirection ? '-102%' : '102%'
			});
		}

		// Animate out section subheading
		if (subheading) {
			tl.hideLines(subheading, {
				y: isNextDirection ? '-102%' : '102%',
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 10
				}
			}, 'start');
		}

		// Animate out section heading
		if (heading) {
			tl.hideChars(heading, varsCharsAnimation, 'start');
		}

		// Animate out section text
		if (text) {
			tl.hideLines(text, {
				y: isNextDirection ? '-102%' : '102%',
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 10
				}
			}, 'start');
		}

		// Animate out section button
		if (button) {
			tl.to(button, {
				y: isNextDirection ? -30 : 30,
				autoAlpha: 0,
				ease,
				duration
			}, 'start');
		}

		// Animate out section overlay
		if (overlay) {
			tl.to(overlay, {
				autoAlpha: 0,
				ease,
				duration
			}, 'start');
		}

		return tl;
	}

	_animateSlideContentIn(duration = this.options.transitionDuration, direction = 'next', {
		subheading,
		heading,
		text,
		button,
		overlay
	}) {
		const
			ease = 'expo.out',
			tl = gsap.timeline(),
			isNextDirection = direction === 'next';

		// Animate in section subheading
		if (subheading) {
			tl.animateLines(subheading, {
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 10
				}
			}, 'start');
		}

		// Animate in section heading
		if (heading) {
			tl.animateChars(heading, {
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 4
				}
			}, 'start');
		}

		// Animate in section text
		if (text) {
			tl.animateLines(text, {
				duration,
				ease,
				stagger: {
					from: isNextDirection ? 'start' : 'end',
					amount: duration / 10
				}
			}, 'start');
		}

		// Animate in section button
		if (button) {
			tl.to(button, {
				duration,
				ease,
				y: 0,
				autoAlpha: 1
			}, 'start');
		}

		// Animate in section overlay
		if (overlay) {
			tl.to(overlay, {
				autoAlpha: 1,
				duration,
				ease
			}, 'start');
		}

		return tl;
	}

	_onVisibleUpdate(visible) {
		if (this.curtains && this.curtains.instance) {
			if (visible) {
				this.curtains.instance.enableDrawing();
			} else {
				this.curtains.instance.disableDrawing();
			}
		}
	}

	_getTextTransitionDirection() {
		if (typeof this.options.textTransitionDirection === 'string') {
			if (this.options.textTransitionDirection === 'auto' && typeof this.options.direction === 'string') {
				return this.options.direction;
			} else {
				return this.options.textTransitionDirection;
			}
		}
	}

	// WebGL methods
	_initCurtains(module) {
		let options = {
			planes: {
				widthSegments: 16,
				heightSegments: 16,
				vertexShader: this._vShaderPlane(),
				fragmentShader: this._fShaderPlane(),
				uniforms: {
					opacity: {
						name: 'uOpacity',
						type: '1f',
						value: 0
					},
					transitionEffect: {
						name: 'uTransitionEffect',
						type: '1f',
						value: 0
					}
				},
				visible: false
			},
			itemIdAttribute: this.options.itemIdAttribute
		};

		if (typeof this.options.webGL === 'object') {
			options = deepmerge(this.options.webGL, options);

			if (typeof this.options.webGL.vertices === 'number') {
				options.planes.widthSegments = this.options.webGL.vertices;
				options.planes.heightSegments = this.options.webGL.vertices;
			}

			if (typeof this.options.webGL.transitionEffect === 'number') {
				options.planes.uniforms.transitionEffect.value = this.options.webGL.transitionEffect / 10;
			}
		}

		this.curtains = new module.default({
			element: this.element,
			container: this.elements.canvasWrapper[0],
			lanes: [this.element],
			options,
		});

		this._initFirstPlane();
	}

	_animateClickAndHoldWebGL({ duration, ease, direction = 'in' }) {
		const tl = gsap.timeline({
			defaults: {
				duration,
				ease
			}
		}),
			isDirectionIn = direction === 'in';

		let targetAmplitudeValue = isDirectionIn ? 0 : 1;

		if (!isDirectionIn && !!this.curtains.options.onHoverOut && !!this.curtains.options.onHoverOut.amplitude) {
			targetAmplitudeValue = this.curtains.options.onHoverOut.amplitude;
		}

		this.curtains.instance.planes.forEach((plane) => {
			const animation = {
				amplitude: plane.uniforms.hoverAmplitude.value
			};

			tl.to(animation, {
				amplitude: targetAmplitudeValue,
				onUpdate: () => {
					plane.uniforms.hoverAmplitude.value = animation.amplitude;
				}
			}, '<');
		});

		return tl;
	}

	_onResize() {
		if (this.curtains && this.curtains.instance) {
			this.curtains.instance.resize();
		}
	}

	_initFirstPlane() {
		const firstPlane = this.curtains.instance.planes.filter(plane => this.elements.sections[0].contains(plane.htmlElement));
		const AJAXRef = app.componentsManager.getComponentByName('AJAX');

		if (firstPlane[0]) {
			// Put the current plane in front
			firstPlane[0].setRenderOrder(1);

			firstPlane[0].uniforms.opacity.value = 0;

			// Turn on plane visibility
			firstPlane[0].visible = true;

			this.updateRef('preloaderRef', 'Preloader');

			if (this.preloaderRef) {
				firstPlane[0].onReady(() => {
					this.preloaderRef.loaded.then(() => this._handlers.ready());
				});
			} else {
				if (AJAXRef && AJAXRef.running) {
					firstPlane[0].onReady(() => {
						document.addEventListener('arts/barba/transition/end/before', this._handlers.ready, {
							once: true
						});
					});
				} else {
					firstPlane[0].onReady(this._handlers.ready);
				}
			}
		}
	}

	_onReady() {
		const animation = {
			scaleX: 1.5,
			scaleY: 1.5,
			opacity: 0,
			transition: 0,
			transformOriginX: 0.5,
			transformOriginY: 0.5,
			transformOriginZ: 0.5
		},
			tl = gsap.timeline(),
			firstPlane = this.curtains.instance.planes.filter(plane => this.elements.sections[0].contains(plane.htmlElement));

		tl.to(animation, {
			opacity: 1,
			transition: 1,
			scaleX: 1,
			scaleY: 1,
			transformOriginX: 0.5,
			transformOriginY: 0.5,
			transformOriginZ: 0.5,
			duration: 2.4,
			ease: 'expo.inOut',
			onStart: () => {

			},
			onUpdate: () => {
				firstPlane[0].uniforms.opacity.value = animation.opacity;

				firstPlane[0].scale.x = animation.scaleX;
				firstPlane[0].scale.y = animation.scaleY;

				firstPlane[0].transformOrigin.x = animation.transformOriginX;
				firstPlane[0].transformOrigin.y = animation.transformOriginY;
				firstPlane[0].transformOrigin.z = animation.transformOriginZ;

				if (animation.opacity < 0.5) {
					firstPlane[0].uniforms.transition.value = animation.transition;
				} else {
					firstPlane[0].uniforms.transition.value = 1 - animation.transition;
				}
			}
		});

		tl.add(() => {
			if (!!this.options.autoplay) {
				this.fullpageSlider.autoplay.init();
			}

			this._toggleInteraction(true);
		}, '<80%');

		this._setWebGLReady();
	}

	_vShaderPlane() {
		return `
			#define PI 3.1415926535897932384626433832795

			precision mediump float;

			// Default mandatory variables
			attribute vec3 aVertexPosition;
			attribute vec2 aTextureCoord;

			uniform mat4 uMVMatrix;
			uniform mat4 uPMatrix;

			uniform mat4 uTextureMatrix0;
			uniform vec2 uPlaneSizes;

			// Custom variables
			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			// Custom uniforms
			uniform vec2 uMousePosition;
			uniform vec2 uViewportSizes;
			uniform float uVelocityX;
			uniform float uVelocityY;
			uniform float uOpacity;
			uniform float uTime;
			uniform float uHoverAmplitude;
			uniform float uHoverSpeed;
			uniform float uHoverSegments;
			uniform float uHovered;
			uniform float uTransition;
			uniform float uTransitionEffect;
			uniform float uElasticEffect;

			void main() {
				vec3 vertexPosition = aVertexPosition;
				vec2 mousePosition = uMousePosition;

				// 3. Transition
				// convert uTransition from [0,1] to [0,1,0]
				float transition = 1.0 - abs((uTransition * 2.0) - 1.0);

				// Get the distance between our vertex and the mouse position
				float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));

				// Calculate our wave effect
				float waveSinusoid = cos(6. * (distanceFromMouse - (uTime * 0.02)));

				// Attenuate the effect based on mouse distance
				float distanceStrength = (0.4 / (distanceFromMouse + 0.4));

				// Calculate our distortion effect
				float distortionEffect = distanceStrength * waveSinusoid * uTransitionEffect;

				// Apply it to our vertex position
				vertexPosition.z +=  distortionEffect * -transition;
				vertexPosition.x +=  distortionEffect * transition * (uMousePosition.x - vertexPosition.x);
				vertexPosition.y +=  distortionEffect * transition * (uMousePosition.y - vertexPosition.y);

				gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

				// Varyings
				vVertexPosition = vertexPosition;
				vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
			}
		`;
	}

	_fShaderPlane() {
		return `
			#define PI 3.1415926535897932384626433832795

			precision mediump float;

			// Variables from vertex shader
			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			// Custom uniforms
			uniform float uOpacity;
			uniform float uTransition;
			uniform float uTime;
			uniform float uHoverAmplitude;
			uniform float uHoverSpeed;
			uniform float uHoverSegments;
			uniform float uHovered;

			// Texture
			uniform sampler2D uSampler0;

			void main() {
				vec3 vertexPosition = vVertexPosition;
				vec2 textureCoord = vTextureCoord;

				vec2 dir = textureCoord - vec2(0.5);
				float dist = distance(textureCoord, vec2(0.5));
				float distortionEffect = sin(dist * 40.0 - (uTime * 0.07) + PI) * 0.007 * uHoverAmplitude;

				textureCoord += dir * distortionEffect;

				// Apply texture
				vec4 finalColor = texture2D(uSampler0, textureCoord);

				// Apply opacity
				finalColor.a = uOpacity;

				// Fake shadows based on vertex position along Z axis
				finalColor.rgb += clamp(distortionEffect, -1.0, 0.0) * 0.33;

				// Fake lights based on vertex position along Z axis
				finalColor.rgb += clamp(distortionEffect, 0.0, 1.0) * 0.33;

				// Display texture
				gl_FragColor = finalColor;
			}
		`;
	}
}

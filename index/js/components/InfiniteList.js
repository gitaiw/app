export default class InfiniteList extends BaseComponent {
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
				webGL: {
					enabled: false,
					watchScroll: 'auto',
					vertices: 16,
					elasticEffect: 2,
					perspectiveEffect: false,
					directionAwareEffect: false,
					dragScalePlanes: 0.95,
					dragScaleTextures: 1.05
				},
				preventScroll: false,
				autoplay: false,
				drag: {
					label: false,
					arrowsDistance: 45,
					scale: 1.2,
					hideNative: false,
					toggleClass: 'infinite-list_mouse-drag'
				},
				direction: 'vertical',
				loop: true,
				autoCenterFirstItem: true,
				marquee: false,
				matchMedia: false,
				onScrollRotatingButtonSpeed: 2,
				scroll: app.options.virtualScroll,
				scrollHeadings: {
					easing: {
						mouse: 0.1,
						touch: 0.1
					},
					speed: {
						mouse: 0.2,
						touch: 3
					},
					maxDelta: {
						mouse: 80,
						touch: 180
					},
				},
				type: 'wheel,touch,pointer',
				toggleScrollingClass: 'infinite-list_scrolling',
				toggleDraggingClass: 'infinite-list_dragging',
				togglePressedClass: 'infinite-list_pressed',
				snapOnRelease: {
					keyboard: true,
					toggleActiveItemClass: 'active',
					removeActiveClassOnInteraction: false
				},
				snapReveal: true,
				hoverReveal: false,
				hoverSyncLanes: false,
				wheelSpeed: -1,
				speedEffect: {
					skew: -0.1,
					scale: -0.1
				},
				opacityEffect: {
					from: 0,
					to: 1
				},
				speedEffectHeadings: {
					skew: -0.1,
					scale: -0.1
				},
				opacityEffectHeadings: {
					from: 0,
					to: 1
				},
				progressEffect: false,
				currentClass: 'current',
				itemIdAttribute: 'data-post-id',
				arrowPrevSelector: '.js-infinite-list__arrow-prev',
				arrowNextSelector: '.js-infinite-list__arrow-next'
			},
			// Component inner elements
			innerElements: {
				canvasWrapper: '.canvas-wrapper',
				laneImages: '.js-infinite-list__lane-images',
				itemImages: '.js-infinite-list__image-item',
				laneHeadings: '.js-infinite-list__lane-headings',
				itemHeadings: '.js-infinite-list__heading-item',
				headingsInner: '.js-infinite-list__headings-inner',
				headingsItems: '.js-infinite-list__heading',
				animationFade: '.js-infinite-list__animation-fade',
				animationScale: '.js-infinite-list__animation-scale',
				animationMask: '.js-infinite-list__animation-mask',
				animationReveal: '.js-infinite-list__animation-reveal',
			},
		});

		this._handlers = {
			hoverIn: this._onMouseEnter.bind(this),
			hoverOut: this._onMouseLeave.bind(this),
			click: this._onMouseClick.bind(this),
			touchStart: this._onTouchStart.bind(this),
			updateView: this._onUpdateView.bind(this),
			updateVisible: this._onUpdateVisible.bind(this),
			resize: app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime()),
			transitionStart: this._onTransitionStart.bind(this)
		};

		this._tlDrag = gsap.timeline({
			defaults: {
				duration: 0.3
			}
		});
		this._animated = false;

		this.clamp = gsap.utils.clamp(1, 10);
		this.setup();
	}

	init() {
		const readyPromises = [];

		this._setRefs();

		if (this.preloaderRef) {
			// readyPromises.push(this.preloaderRef.loaded);
		}

		this._setHeadings();
		this._createInfiniteListHeadings();
		this._createInfiniteListImages();

		if (this.infiniteListImages) {
			readyPromises.push(this.infiniteListImages.pluginsReady);
		}

		if (this.infiniteListHeadings) {
			readyPromises.push(this.infiniteListHeadings.pluginsReady);
		}

		this._toggleInteraction(false);

		if (this._isWebGLOptionEnabled()) {
			this.setLoading(true);

			app.componentsManager.load({
				properties: app.components['CurtainsBase'],
			}).then((module) => {
				readyPromises.push(this.webGLReady);

				this.infiniteListImages.init();

				this.infiniteListImages.pluginsReady.then(() => {
					if (!this._hasAnimationScene() && typeof this.options.autoplay === 'number') {
						// this._pauseAutoplay();
					}

					this._initCurtains(module);
					this._attachEvents();
				});


				Promise.all(readyPromises).then(() => {
					if (!this._hasAnimationScene() && typeof this.options.autoplay === 'number') {
						// this._resumeAutoplay();
					}
					this._onResize();
					this.setLoading(false);
				});
			});
		} else {
			this._attachEvents();

			if (!this._hasAnimationScene() && typeof this.options.autoplay === 'number' && this.preloaderRef) {
				// this._pauseAutoplay();
			}

			Promise.all(readyPromises).then(() => {
				if (!this._hasAnimationScene() && typeof this.options.autoplay === 'number' && this.preloaderRef) {
					// this._resumeAutoplay();
				}
			});
		}
	}

	destroy() {
		this._detachEvents();

		if (this.infiniteListImages) {
			this.infiniteListImages.destroy();
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.destroy();
		}

		if (this.curtains) {
			document.addEventListener('arts/barba/transition/end', this.curtains.destroy.bind(this.curtains), {
				once: true
			});
		}
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => resolve(true)
			});

			if (this.elements.animationReveal.length) {
				tl.set(this.elements.animationReveal, {
					y: '100%'
				});
			}

			if (!this._isWebGLOptionEnabled() && this.elements.animationMask.length) {
				this.elements.animationMask.forEach((el) => {
					tl.hideMask(el, {
						clearProps: '',
						duration: 0,
						animateTo: 'bottom'
					});
				});
			}

			if (this.elements.animationFade.length) {
				tl.set(this.elements.animationFade, {
					autoAlpha: 0
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
			paused: true,
			onComplete: () => {
				if (!this._isWebGLOptionEnabled()) {
					this._toggleInteraction(true);
					this._initAutoplay();
					this._initMarquee();
				}
				this._onResize();
			}
		});

		if (this.elements.animationReveal.length) {
			tl.to(this.elements.animationReveal, {
				y: '0%',
				duration: 1.2,
				ease: 'power3.out',
				stagger: distributeByPosition({
					from: 'start',
					axis: 'y',
					amount: 1.2
				}),
			}, 'start');
		}

		if (!this._isWebGLOptionEnabled()) {
			if (this.elements.animationMask.length) {
				this.elements.animationMask.forEach((el, index) => {
					tl.animateMask(el, {
						animateFrom: 'bottom',
						duration: 1.2,
						ease: 'power3.inOut'
					}, index === 0 ? 'start' : '<0.02');
				});
			}

			if (this.elements.animationFade.length) {
				tl.to(this.elements.animationFade, {
					autoAlpha: 1,
					duration: 1.2,
					stagger: 0.05,
					clearProps: 'opacity,visibility',
					ease: 'power3.out'
				}, 'start');
			}

			if (this.elements.animationScale.length) {
				tl.animateScale(this.elements.animationScale, {
					ease: 'power3.out',
					duration: 1.2,
					animateFrom: 'center'
				}, 'start');
			}
		}

		return tl;
	}

	_setRefs() {
		this.splitCounterRef = this._getInnerComponentByName('SplitCounter');
		this.rotatingButtons = this.components.filter((component, index) => component.name === 'RotatingButton');

		this.updateRef('preloaderRef', 'Preloader');
		this.updateRef('cursorRef', 'CursorFollower');
	}

	_isWebGLOptionEnabled() {
		return app.utilities.isEnabledOption(this.options.webGL);
	}

	_attachEvents() {
		this.resizeInstance = new ResizeObserver(app.utilities.debounce(this._setHeadings.bind(this), app.utilities.getDebounceTime()));
		this.resizeInstance.observe(this.element);

		if (!!this.options.snapOnRelease && this.splitCounterRef) {
			this.infiniteListImages.pluginsReady.then(() => {
				this._updateCounter(1);
			});

			this.infiniteListImages.controller
				.on('scrollSnap', ({
					indexItem,
					element
				}) => {
					this._updateCounter(indexItem + 1);
				});
		}

		if (!!this.options.snapReveal) {
			this.infiniteListImages.pluginsReady.then(() => {
				this._removeHiglightElements();

				if (!!this.options.snapOnRelease) {
					const link = this.element.querySelector(`[${this.options.itemIdAttribute}]`);

					this._highlightActiveElements(link, true);
				}
			});

			this.infiniteListImages.controller
				.on('scrollSnap', ({
					indexItem,
					element
				}) => {
					const link = element.querySelector(`[${this.options.itemIdAttribute}]`);

					this._removeHiglightElements();
					this._highlightActiveElements(link, true);
				})
				.on('interactionStart', () => {
					this._removeHiglightElements();
				})
				.on('dragStart', () => {
					this._removeHiglightElements();
				});
		}

		if (!!this.options.hoverReveal) {
			app.hoverEffect.attachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);
		}

		if (!!this.options.onScrollRotatingButtonSpeed && this.rotatingButtons.length) {
			this.infiniteListImages.controller.on('scrollUpdate', (velocity, direction) => {
				let multiplier = this.clamp(velocity * 100) * this.options.onScrollRotatingButtonSpeed;

				this.rotatingButtons.forEach((button) => {
					if (button.stScrub) {
						button.stScrub.animation.timeScale(multiplier);
					}
				});
			});
		}

		if (typeof this.options.autoplay === 'number' && this.rotatingButtons.length) {
			this._attachAutoplayEvents();
			// if (this._isWebGLOptionEnabled()) {
			// 	this.webGLReady.then(() => {
			// 		this._attachAutoplayEvents();
			// 	});
			// } else {
			// 	this._attachAutoplayEvents();
			// }
		}

		if (this._isWebGLOptionEnabled()) {
			app.utilities.attachResponsiveResize({
				callback: this._handlers.resize,
				immediateCall: false
			});
		}

		this.element.addEventListener('click', this._handlers.click);

		if (!!this.options.drag) {
			if (typeof this.options.drag.toggleClass === 'string') {
				this.element.classList.add(this.options.drag.toggleClass);
			}

			this._attachDragListeners();
		}

		document.addEventListener('arts/barba/transition/start', this._handlers.transitionStart, {
			once: true
		});
	}

	_detachEvents() {
		if (this.resizeInstance) {
			this.resizeInstance.unobserve(this.element);
		}

		if (!!this.options.hoverReveal) {
			app.hoverEffect.detachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);
		}

		if (this.options.direction === 'vertical' && !!this.options.preventScroll) {
			this.infiniteListImages.container.removeEventListener('touchmove', this._handlers.touchStart);
		}

		// if (!!this.options.webGL) {
		// 	window.removeEventListener(
		// 		app.utilities.getResponsiveResizeEvent(),
		// 		this._handlers.resize
		// 	);
		// }
	}

	_onTransitionStart() {
		this._removeHiglightElements();

		if (!!this.options.autoplay) {
			this._pauseAutoplay();
		}
	}

	_initMarquee() {
		if (this.infiniteListImages) {
			this.infiniteListImages.pluginsReady.then(() => {
				if (this.infiniteListImages.plugins.marquee) {
					this.infiniteListImages.plugins.marquee.init();
				}
			});
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.pluginsReady.then(() => {
				if (this.infiniteListHeadings.plugins.marquee) {
					this.infiniteListHeadings.plugins.marquee.init();
				}
			});
		}
	}

	_initAutoplay() {
		if (this.infiniteListImages) {
			this.infiniteListImages.pluginsReady.then(() => {
				if (this.infiniteListImages.plugins.autoplay) {
					this.infiniteListImages.plugins.autoplay.init();
				}
			});
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.pluginsReady.then(() => {
				if (this.infiniteListHeadings.plugins.autoplay) {
					this.infiniteListHeadings.plugins.autoplay.init();
				}
			});
		}
	}

	_pauseAutoplay() {
		if (this.infiniteListImages) {
			this.infiniteListImages.pluginsReady.then(() => {
				if (this.infiniteListImages.plugins.autoplay) {
					this.infiniteListImages.plugins.autoplay.disable();
				}
			});
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.pluginsReady.then(() => {
				if (this.infiniteListHeadings.plugins.autoplay) {
					this.infiniteListHeadings.plugins.autoplay.disable();
				}
			});
		}
	}

	_resumeAutoplay() {
		if (this.infiniteListImages) {
			this.infiniteListImages.pluginsReady.then(() => {
				if (this.infiniteListImages.plugins.autoplay) {
					this.infiniteListImages.plugins.autoplay.enable();
				}
			});
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.pluginsReady.then(() => {
				if (this.infiniteListHeadings.plugins.autoplay) {
					this.infiniteListHeadings.plugins.autoplay.enable();
				}
			});
		}
	}

	_scrollTo(link) {
		const ID = parseInt(link.getAttribute(`${this.options.itemIdAttribute}`));

		if (this.elements.laneHeadings[0] && this.elements.laneHeadings[0].contains(link)) {

			// Images #1 & #2 lanes
			if (this.infiniteListImages && this.infiniteListImages.enabled) {
				const currentIDLane1 = this._getIndexOfID(this.elements.laneImages[0], ID);
				const currentIDLane2 = this._getIndexOfID(this.elements.laneImages[1], ID);

				if (currentIDLane1 >= 0) {
					this.infiniteListImages.controller.scrollTo({ indexItem: currentIDLane1, indexLane: 0, position: 'center' });
				}

				if (currentIDLane2 >= 0) {
					this.infiniteListImages.controller.scrollTo({ indexItem: currentIDLane2, indexLane: 1, position: 'center' });
				}
			}
		} else if (this.elements.laneImages[0] && this.elements.laneImages[0].contains(link)) {
			// Images #2 lane
			if (this.infiniteListImages && this.infiniteListImages.enabled) {
				const currentID = this._getIndexOfID(this.elements.laneImages[1], ID);

				if (currentID >= 0) {
					this.infiniteListImages.controller.scrollTo({ indexItem: currentID, indexLane: 1, position: 'center' });
				}
			}

			// Headings
			if (this.infiniteListHeadings && this.infiniteListHeadings.enabled) {
				const currentID = this._getIndexOfID(this.elements.laneHeadings[0], ID);

				if (currentID >= 0) {
					this.infiniteListHeadings.controller.scrollTo({ indexItem: currentID, position: 'center' });
				}
			}
		} else if (this.elements.laneImages[1] && this.elements.laneImages[1].contains(link)) {
			// Images #1 lane
			if (this.infiniteListImages && this.infiniteListImages.enabled) {
				const currentID = this._getIndexOfID(this.elements.laneImages[0], ID);

				if (currentID >= 0) {
					this.infiniteListImages.controller.scrollTo({ indexItem: currentID, indexLane: 0, position: 'center' });
				}
			}

			// Headings
			if (this.infiniteListHeadings && this.infiniteListHeadings.enabled) {
				const currentID = this._getIndexOfID(this.elements.laneHeadings[0], ID);

				if (currentID >= 0) {
					this.infiniteListHeadings.controller.scrollTo({ indexItem: currentID, position: 'center' });
				}
			}
		}
	}

	_getIndexOfID(container, ID) {
		let result = -1;

		if (container) {
			const elements = [...container.querySelectorAll(`[${this.options.itemIdAttribute}]`)];

			elements.forEach((el, index) => {
				const currentID = parseInt(el.getAttribute(`${this.options.itemIdAttribute}`));

				if (currentID === ID) {
					result = index;
				}
			});
		}

		return result;
	}

	_onMouseEnter(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._highlightActiveElements(target, true);

			if (!!this.options.hoverSyncLanes) {
				this._scrollTo(target);
			}

			this._toggleMarqueeAnimation(false);
		}
	}

	_onMouseLeave(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._highlightActiveElements(target, false);
			this._toggleMarqueeAnimation(true);
		}
	}

	_onMouseClick(event) {
		if (app.utilities.shouldPreventLinkClick(event)) {
			return;
		}

		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._detachEvents();

			if (this.infiniteListImages.enabled) {
				this.infiniteListImages.view.off('update', this._handlers.updateView);
				this.infiniteListImages.plugins.scroll.disable();
			}
		}

		// Prev arrow
		if (typeof this.options.arrowPrevSelector === 'string' && event.target instanceof HTMLElement && event.target.closest(this.options.arrowPrevSelector)) {
			if (this.infiniteListImages && this.infiniteListImages.enabled) {
				event.preventDefault();
				this.infiniteListImages.controller.snapPrev();
			}
		}

		// Next arrow
		if (typeof this.options.arrowNextSelector === 'string' && event.target instanceof HTMLElement && event.target.closest(this.options.arrowNextSelector)) {
			if (this.infiniteListImages && this.infiniteListImages.enabled) {
				event.preventDefault();
				this.infiniteListImages.controller.snapNext();
			}
		}
	}

	_onTouchStart(event) {
		event.preventDefault();
	}

	_updateCounter(number) {
		this.splitCounterRef.current = number;
	}

	_highlightActiveElements(link, enabled = true) {
		if (!link) {
			return;
		}

		const
			ID = parseInt(link.getAttribute(`${this.options.itemIdAttribute}`)),
			elements = [...this.element.querySelectorAll(`[${this.options.itemIdAttribute}="${ID}"]`)];

		if (elements.length) {
			elements.forEach((el) => {
				el.classList.toggle(`${this.options.currentClass}`, enabled);
			});
		}
	}

	_removeHiglightElements() {
		const elements = [...this.element.querySelectorAll(`.${this.options.currentClass}[${this.options.itemIdAttribute}]`)];

		if (elements.length) {
			elements.forEach((el) => {
				el.classList.remove(`${this.options.currentClass}`);
			});
		}
	}

	_createInfiniteListHeadings() {
		if (this.elements.laneHeadings.length) {
			this.infiniteListHeadings = new ArtsInfiniteList(this.element, {
				direction: this.options.direction,
				mapWheelEventYtoX: true,
				autoCenterFirstItem: this.options.autoCenterFirstItem,
				listElementsSelector: this.innerSelectors.itemHeadings,
				multiLane: {
					laneSelector: this.innerSelectors.laneHeadings,
					laneOptionsAttribute: 'data-arts-infinite-list-options'
				},
				matchMedia: this.options.matchMedia,
				loop: this.options.loop,
				autoClone: this.options.loop,
				scroll: this.options.scrollHeadings || this.options.scroll,
				plugins: {
					scroll: {
						type: this.options.type,
						preventDefault: this.options.preventScroll
					},
					speedEffect: this.options.speedEffectHeadings,
					opacityEffect: this.options.opacityEffectHeadings
				},
			});
		}
	}

	_createInfiniteListImages() {
		if (this.elements.laneImages.length) {
			this.infiniteListImages = new ArtsInfiniteList(this.element, {
				init: !(!!this.options.webGL && this.options.webGL.enabled),
				direction: this.options.direction,
				mapWheelEventYtoX: true,
				autoCenterFirstItem: this.options.autoCenterFirstItem,
				listElementsSelector: this.innerSelectors.itemImages,
				multiLane: {
					laneSelector: this.innerSelectors.laneImages,
					laneOptionsAttribute: 'data-arts-infinite-list-options'
				},
				matchMedia: this.options.matchMedia,
				loop: this.options.loop,
				autoClone: this.options.loop,
				scroll: this.options.scroll,
				plugins: {
					autoplay: typeof this.options.autoplay === 'number' ? {
						autoInit: false,
						duration: this.options.autoplay
					} : false,
					marquee: typeof this.options.marquee === 'object' ? {
						autoInit: false,
						...this.options.marquee
					} : false,
					scroll: {
						type: this.options.type,
						toggleScrollingClass: this.options.toggleScrollingClass,
						toggleDraggingClass: this.options.toggleDraggingClass,
						togglePressedClass: this.options.togglePressedClass,
						snapOnRelease: this.options.snapOnRelease,
						preventDefault: this.options.preventScroll
					},
					speedEffect: this.options.speedEffect,
					opacityEffect: this.options.opacityEffect,
					progressEffect: this.options.progressEffect
				},
			});
		}
	}

	_setHeadings() {
		let
			maxWidth = 0,
			maxHeight = 0,
			textAlign = gsap.getProperty(this.elements.headingsInner[0], 'text-align');

		this.elements.headingsItems.forEach((el) => {
			if (el.offsetWidth > maxWidth) {
				maxWidth = el.offsetWidth;
			}

			if (el.offsetHeight > maxHeight) {
				maxHeight = el.offsetHeight;
			}
		});

		gsap.set(this.elements.headingsInner[0], {
			// width: maxWidth * 1.2,
			height: maxHeight
		});

		gsap.set(this.elements.headingsItems, {
			position: 'absolute',
			top: '50%',
			left: textAlign === 'left' ? 0 : textAlign === 'center' ? 0 : '',
			right: textAlign === 'right' || textAlign === 'center' ? 0 : '',
		});
	}

	_toggleMarqueeAnimation(enabled = true) {
		if (!this.infiniteListImages.enabled) {
			return;
		}

		if (!!this.options.marquee && this.infiniteListImages.plugins.marquee) {
			if (enabled) {
				this.infiniteListImages.plugins.marquee.enable();
			} else {
				this.infiniteListImages.plugins.marquee.disable();
			}
		}
	}

	_toggleInteraction(enabled = true) {
		this.element.classList.toggle('pointer-events-inner-none', !enabled);

		if (this.infiniteListImages) {
			this.infiniteListImages.pluginsReady.then(() => {
				if (this.infiniteListImages && 'scroll' in this.infiniteListImages.plugins) {
					this.infiniteListImages.plugins.scroll.ignore = !enabled;
				}
			});
		}

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.pluginsReady.then(() => {
				if (this.infiniteListHeadings && 'scroll' in this.infiniteListHeadings.plugins) {
					this.infiniteListHeadings.plugins.scroll.ignore = !enabled;
				}
			});
		}
	}

	// WebGL methods
	_initCurtains(module) {
		const AJAXRef = app.componentsManager.getComponentByName('AJAX');
		let options = {
			planes: {
				visible: true,
				widthSegments: 16,
				heightSegments: 16,
				vertexShader: this._vShaderPlane(),
				fragmentShader: this._fShaderPlane(),
				uniforms: {
					opacity: {
						name: 'uOpacity',
						type: '1f',
						value: 0
					}
				},
			},
			itemIdAttribute: this.options.itemIdAttribute,
			onContextLost: this._handlers.resize
		};

		if (typeof this.options.webGL === 'object') {
			options = deepmerge(this.options.webGL, options);

			if (typeof this.options.webGL.vertices === 'number') {
				options.planes.widthSegments = this.options.webGL.vertices;
				options.planes.heightSegments = this.options.webGL.vertices;
			}
		}

		this.curtains = new module.default({
			element: this.element,
			container: this.elements.canvasWrapper[0],
			lanes: this.elements.laneImages,
			options,
		});

		if (this.infiniteListImages.enabled) {
			if (this._shouldApplyPerspectiveShaderPass()) {
				this._initPerspectiveShaderPass();
				this._initFXAAPass();
			}
		} else {
			// Turn on planes visibility if they are not pulled off the DOM
			// e.g. hidden by "display: none"
			this.curtains.instance.planes.forEach(plane => plane.visible = !!plane.htmlElement.offsetParent);

			this.infiniteListImages.once('afterInit', () => {
				this._attachPlanesUpdateListeners();

				if (this._shouldApplyPerspectiveShaderPass()) {
					this._initPerspectiveShaderPass();
					this._initFXAAPass();
				}

				window.matchMedia(`${this.options.matchMedia}`).onchange = (event) => {
					this.curtains.instance.disableDrawing();

					if (event.matches) {
						this.curtains.resetPlanesVelocity();
						this.curtains.resetPlanesTranslation();
						this.curtains.resetPlanesScale();

						// Force hide all planes by default
						this.curtains.resetPlanesVisibility(false);

						this._attachPlanesUpdateListeners();
					} else {
						this._detachPlanesUpdateListeners();

						this.curtains.resetPlanesVelocity();
						this.curtains.resetPlanesTranslation();
						this.curtains.resetPlanesScale();
						this.curtains.resetPlanesVisibility();
					}

					this.curtains.instance.enableDrawing();
				}
			});
		}

		if (this.curtains.instance && this.curtains.instance.planes[0]) {
			this.tlPlanes = gsap.timeline({
				paused: true,
				defaults: {
					duration: 2.4,
					ease: 'expo.out'
				}
			});

			if (this.elements.animationFade.length) {
				this.tlPlanes.to(this.elements.animationFade, {
					autoAlpha: 1,
					duration: 1.2,
					stagger: 0.05,
					clearProps: 'opacity,visibility',
					ease: 'power3.out'
				}, 'start');
			}

			if (this.elements.animationScale.length) {
				this.tlPlanes.animateScale(this.elements.animationScale, {
					ease: 'power3.out',
					duration: 1.2,
					animateFrom: 'center'
				}, 'start');
			}

			this.updateRef('preloaderRef', 'Preloader');

			for (const [index, lane] of Object.entries(this.curtains.planes)) {
				const indexLane = parseInt(index.toString());

				lane.forEach((plane, indexPlane) => {
					if (indexLane === 0 && indexPlane === 0) {
						plane.onReady(() => {
							let opacity;

							if ('opacity' in this.infiniteListImages.view.current[indexLane].items[indexPlane]) {
								opacity = this.infiniteListImages.view.current[indexLane].items[indexPlane].opacity;
							}

							if (AJAXRef && AJAXRef.running) {
								document.addEventListener('arts/barba/transition/end/before', () => {
									this._attachPlanesUpdateListeners();
									this._attachDragWebGLListeners();
									this._setWebGLReady();

									this._animatePlane(plane, opacity, () => {
										this._toggleInteraction(true);
										this._initAutoplay();
										this._initMarquee();
										this._animated = true;
									});
									this.tlPlanes.play();
								}, {
									once: true
								});
							} else {
								if (this.preloaderRef) {
									this.preloaderRef.loaded.then(() => {
										this._attachPlanesUpdateListeners();
										this._attachDragWebGLListeners();
										this._setWebGLReady();

										this._animatePlane(plane, opacity, () => {
											this._toggleInteraction(true);
											this._initAutoplay();
											this._initMarquee();
											this._animated = true;
										});
										this.tlPlanes.play();
									});
								} else {
									this._attachPlanesUpdateListeners();
									this._attachDragWebGLListeners();
									this._setWebGLReady();

									this._animatePlane(plane, opacity, () => {
										this._toggleInteraction(true);
										this._initAutoplay();
										this._initMarquee();
										this._animated = true;
									});
									this.tlPlanes.play();
								}
							}
						});
					} else {
						plane.onReady(() => {
							let opacity;

							if ('opacity' in this.infiniteListImages.view.current[indexLane].items[indexPlane]) {
								opacity = this.infiniteListImages.view.current[indexLane].items[indexPlane].opacity;
							}

							if (AJAXRef && AJAXRef.running) {
								document.addEventListener('arts/barba/transition/end/before', () => {
									this._animatePlane(plane, opacity);
								}, {
									once: true
								})
							} else {
								if (this.preloaderRef) {
									this.preloaderRef.loaded.then(() => {
										this._animatePlane(plane, opacity);
									});
								} else {
									this._animatePlane(plane, opacity);
								}
							}
						});
					}
				});
			};

		} else {
			this._setWebGLReady();
			this._attachDragWebGLListeners();
			this._toggleInteraction(true);
		}
	}

	_animatePlane(plane, opacity, cb) {
		const wrapperEl = plane.htmlElement.closest(this.innerSelectors.itemImages);
		const isInViewport = this._isInViewport(wrapperEl);
		const isVisible = gsap.getProperty(wrapperEl, 'visibility') === 'visible';

		if (!isVisible || !isInViewport) {
			plane.visible = false;
			plane.uniforms.opacity.value = 1;

			if (typeof cb === 'function') {
				gsap.delayedCall(1.8, cb);
			}
			return;
		}

		const
			animation = {
				scaleX: 0.75,
				scaleY: 0.75,
				opacity: 0,
				transition: 0.5,
				transformOriginX: 0.5,
				transformOriginY: 0.5,
				transformOriginZ: 0.5
			},
			vars = {
				transition: 1,
				scaleX: 1,
				scaleY: 1,
				opacity: 1,
				transformOriginX: 0.5,
				transformOriginY: 0.5,
				transformOriginZ: 0.5,
				onStart: () => {
					if (typeof cb === 'function') {
						gsap.delayedCall(1.8, cb);
					}
				},
				onUpdate: () => {
					if (!this._animated && 'opacity' in animation && typeof animation.opacity === 'number') {
						plane.uniforms.opacity.value = animation.opacity;
						// if (animation.opacity < 0.5) {
						// 	plane.uniforms.transition.value = animation.transition;
						// } else {
						// 	plane.uniforms.transition.value = 1 - animation.transition;
						// }
					}

					plane.uniforms.transition.value = animation.transition;

					plane.scale.x = animation.scaleX;
					plane.scale.y = animation.scaleY;

					plane.transformOrigin.x = animation.transformOriginX;
					plane.transformOrigin.y = animation.transformOriginY;
					plane.transformOrigin.z = animation.transformOriginZ;
				}
			};

		if (typeof opacity === 'number') {
			vars.opacity = opacity;
		}

		this.tlPlanes.to(animation, vars, '<0.04');
	}

	_isInViewport(element) {
		const rect = element.getBoundingClientRect();
		const height = window.innerHeight || document.documentElement.clientHeight;
		const width = window.innerWidth || document.documentElement.clientWidth;
		const offset = { left: 0, right: 0, top: 0, bottom: 0 };

		return (
			rect.right >= -offset.left &&
			rect.bottom >= -offset.top &&
			rect.left <= width + offset.right &&
			rect.top <= height + offset.bottom
		);
	}

	_attachDragWebGLListeners() {
		this.infiniteListImages.controller
			.on('dragPressed', (pressed) => {
				this._tlDrag.clear();
				this._toggleMarqueeAnimation(!pressed);

				if (pressed) {
					this.curtains.instance.planes.forEach((plane) => {
						const animation = {
							scaleX: plane.scale.x,
							scaleY: plane.scale.y,
							transformOriginX: plane.transformOrigin.x,
							transformOriginY: plane.transformOrigin.y,
							transformOriginZ: plane.transformOrigin.z
						};

						this._tlDrag.to(animation, {
							scaleX: this.options.webGL.dragScalePlanes,
							scaleY: this.options.webGL.dragScalePlanes,
							transformOriginX: 0.5,
							transformOriginY: 0.5,
							transformOriginZ: 0.5,
							onUpdate: () => {
								plane.scale.x = animation.scaleX;
								plane.scale.y = animation.scaleY;
							}
						}, 'start');

						plane.textures.forEach((texture) => {
							const animation = {
								scaleX: texture.scale.x,
								scaleY: texture.scale.y,
							};

							this._tlDrag.to(animation, {
								scaleX: this.options.webGL.dragScaleTextures,
								scaleY: this.options.webGL.dragScaleTextures,
								onUpdate: () => {
									texture.scale.x = animation.scaleX;
									texture.scale.y = animation.scaleY;
								}
							}, 'start');
						});
					});
				} else {
					this.curtains.instance.planes.forEach((plane) => {
						const animation = {
							scaleX: plane.scale.x,
							scaleY: plane.scale.y
						};

						this._tlDrag.to(animation, {
							scaleX: 1,
							scaleY: 1,
							onUpdate: () => {
								plane.scale.x = animation.scaleX;
								plane.scale.y = animation.scaleY;
							}
						}, 'start');

						plane.textures.forEach((texture) => {
							const animation = {
								scaleX: texture.scale.x,
								scaleY: texture.scale.y,
							};

							this._tlDrag.to(animation, {
								scaleX: 1,
								scaleY: 1,
								onUpdate: () => {
									texture.scale.x = animation.scaleX;
									texture.scale.y = animation.scaleY;
								}
							}, 'start');
						});
					});
				}
			})
			.on('dragStart', () => {
				this._tlDrag.clear();
				this._toggleMarqueeAnimation(false);
				this.curtains.instance.planes.forEach((plane) => {
					const animation = {
						scaleX: plane.scale.x,
						scaleY: plane.scale.y,
						transformOriginX: plane.transformOrigin.x,
						transformOriginY: plane.transformOrigin.y,
						transformOriginZ: plane.transformOrigin.z
					};

					this._tlDrag.to(animation, {
						scaleX: this.options.webGL.dragScalePlanes,
						scaleY: this.options.webGL.dragScalePlanes,
						transformOriginX: 0.5,
						transformOriginY: 0.5,
						transformOriginZ: 0.5,
						onUpdate: () => {
							plane.scale.x = animation.scaleX;
							plane.scale.y = animation.scaleY;

							plane.transformOrigin.x = animation.transformOriginX;
							plane.transformOrigin.y = animation.transformOriginY;
							plane.transformOrigin.z = animation.transformOriginZ;
						}
					}, 'start');

					plane.textures.forEach((texture) => {
						const animation = {
							scaleX: texture.scale.x,
							scaleY: texture.scale.y,
						};

						this._tlDrag.to(animation, {
							scaleX: this.options.webGL.dragScaleTextures,
							scaleY: this.options.webGL.dragScaleTextures,
							onUpdate: () => {
								texture.scale.x = animation.scaleX;
								texture.scale.y = animation.scaleY;
							}
						}, 'start');
					});
				});
			})
			.on('dragComplete', () => {
				this._tlDrag.clear();
				this._toggleMarqueeAnimation(true);

				this.curtains.instance.planes.forEach((plane) => {
					const animation = {
						scaleX: plane.scale.x,
						scaleY: plane.scale.y
					};

					this._tlDrag.to(animation, {
						scaleX: 1,
						scaleY: 1,
						onUpdate: () => {
							plane.scale.x = animation.scaleX;
							plane.scale.y = animation.scaleY;
						}
					}, 'start');

					plane.textures.forEach((texture) => {
						const animation = {
							scaleX: texture.scale.x,
							scaleY: texture.scale.y,
						};

						this._tlDrag.to(animation, {
							scaleX: 1,
							scaleY: 1,
							onUpdate: () => {
								texture.scale.x = animation.scaleX;
								texture.scale.y = animation.scaleY;
							}
						}, 'start');
					});
				});
			})
			.on('clonesAdded', ({ indexLane, clones }) => {
				clones.forEach((el) => {
					el.setAttribute('style', null);
					this.curtains.loadPlane(indexLane, el);
				});
			});
	}

	_attachDragListeners() {
		this.infiniteListImages.controller.on('dragPressed', (pressed) => {
			this.updateRef('cursorRef', 'CursorFollower');

			if (this.cursorRef) {
				if (pressed) {
					this.cursorRef.instance.reset();
					this.cursorRef.instance.set({
						autoReset: false,
						arrows: this.options.direction,
						arrowsDistance: this.options.drag.arrowsDistance,
						scale: this.options.drag.scale,
						label: this.options.drag.label || '',
						hideNative: this.options.drag.hideNative
					});
				} else {
					this.cursorRef.instance.set({
						autoReset: true,
					});
					this.cursorRef.instance.reset();
				}
			}
		});

		// Prevent "pull-to-refresh" on touch devices
		if (this.options.direction === 'vertical' && !!this.options.preventScroll) {
			this.infiniteListImages.container.addEventListener('touchmove', this._handlers.touchStart);
		}
	}

	_attachAutoplayEvents() {
		const
			circles = [],
			finishingDuration = 0.6;

		this.tlAutoplay = gsap.timeline({
			paused: true
		});

		this.rotatingButtons.forEach(({ element }) => {
			const circle = element.querySelector('circle');

			if (circle) {
				circles.push(circle);
			}
		});

		this.tlAutoplay
			.fromTo(circles, {
				rotate: 0,
				transformOrigin: 'center center',
				drawSVG: '0% 0%',
			}, {
				rotate: 180,
				transformOrigin: 'center center',
				duration: this.options.autoplay - finishingDuration / 2,
				drawSVG: '0% 100%',
				ease: 'none'
			})
			.to(circles, {
				rotate: 360,
				transformOrigin: 'center center',
				drawSVG: '100% 100%',
				ease: 'power3.inOut',
				duration: finishingDuration
			});

		this.infiniteListImages.controller
			.on('autoplayStart', this.tlAutoplay.restart.bind(this.tlAutoplay))
			.on('autoplayStop', () => {
				this.tlAutoplay.kill();

				gsap.to(circles, {
					rotate: 180,
					transformOrigin: 'center center',
					drawSVG: '100% 100%',
					ease: 'power3.inOut',
					duration: finishingDuration
				});
			})
			.on('autoplayPause', () => {
				this.tlAutoplay.pause();

				gsap.to(circles, {
					rotate: 180,
					transformOrigin: 'center center',
					drawSVG: '100% 100%',
					ease: 'power3.inOut',
					duration: finishingDuration
				});
			})
			.on('autoplayResume', this.tlAutoplay.play.bind(this.tlAutoplay));
	}

	_initPerspectiveShaderPass() {
		const params = {
			fragmentShader: this._fShaderPassPerspective(),
			uniforms: {
				viewportSizes: {
					name: 'uViewportSizes',
					type: '2f',
					value: this.curtains._getViewportSize()
				},
				velocity: {
					name: 'uVelocity',
					type: '1f',
					value: 0,
				},
				strength: {
					name: 'uStrength',
					type: '1f',
					value: this.options.webGL.perspectiveEffect
				}
			}
		};

		this.perspectivePass = new ShaderPass(this.curtains.instance, params);

		if (this.perspectivePass && typeof this.perspectivePass.uniforms === 'object') {
			const directionAwareEffect = this.options.webGL.directionAwareEffect;

			this.infiniteListImages.controller.on('scrollUpdate', (velocity, direction) => {
				let adjustedVelocity = velocity;

				if (directionAwareEffect) {
					const multiplier = typeof directionAwareEffect === 'number' ? directionAwareEffect : 1;

					adjustedVelocity = (direction === 'forward' ? velocity : -velocity) * multiplier;
				}

				this.perspectivePass.uniforms.velocity.value = adjustedVelocity;
			});
		}
	}

	_destroyPerspectiveShaderPass() {
		if (this.perspectivePass && typeof this.perspectivePass.dispose === 'function') {
			this.perspectivePass.dispose();
			this.perspectivePass = null;
		}
	}

	_initFXAAPass() {
		// this.FXAAPass = new FXAAPass(this.curtains.instance);
	}

	_destroyFXAAPass() {
		if (this.FXAAPass && typeof this.FXAAPass.dispose === 'function') {
			this.FXAAPass.dispose();
			this.FXAAPass = null;
		}
	}

	_shouldApplyPerspectiveShaderPass() {
		return typeof this.options.webGL === 'object' && typeof this.options.webGL.perspectiveEffect === 'number' && this.options.webGL.perspectiveEffect !== 0;
	}

	_attachPlanesUpdateListeners() {
		this.infiniteListImages.controller.on('visibleUpdate', this._handlers.updateVisible);
		this.infiniteListImages.view.on('update', this._handlers.updateView);
	}

	_detachPlanesUpdateListeners() {
		this.infiniteListImages.controller.off('visibleUpdate', this._handlers.updateVisible);
		this.infiniteListImages.view.off('update', this._handlers.updateView);
	}

	_onResize({ updateCurtains = true, disableInfiniteList = true } = {}) {
		let enabled = this.infiniteListImages.enabled;

		if (!!this.curtains) {
			if (disableInfiniteList && enabled) {
				this.infiniteListImages.disable();
			}

			this.curtains.instance.planes.forEach((plane, index) => {
				const listItem = plane.htmlElement.closest(this.innerSelectors.itemImages);
				// let savedStyle;

				if (listItem) {
					// savedStyle = listItem.getAttribute('style');
					listItem.setAttribute('style', null);
				}

				plane.scale.x = 1;
				plane.scale.y = 1;

				if (plane.textures.length) {
					plane.textures.forEach((texture) => {
						texture.scale.x = 1;
						texture.scale.y = 1;
					});
				}

				plane.updatePosition();

				// if (listItem) {
				// 	listItem.setAttribute('style', savedStyle);
				// }
			});

			if (updateCurtains) {
				this.curtains.instance.resize();
			}

			if (disableInfiniteList && enabled) {
				this.infiniteListImages.enable();
			}
		}
	}

	_onUpdateView({ updatedItemState, indexLane, indexItem }) {
		if (!this.curtains.planes[indexLane] || !this.curtains.planes[indexLane][indexItem]) {
			return;
		}

		const plane = this.curtains.planes[indexLane][indexItem];

		if (typeof plane.uniforms !== 'object') {
			return;
		}

		if (this.options.direction === 'horizontal') {
			plane.uniforms.velocityX.value = this.infiniteListImages.controller.lanes[indexLane].scroller.velocity;
			plane.uniforms.velocityY.value = 0;
		} else {
			plane.uniforms.velocityX.value = 0;
			plane.uniforms.velocityY.value = this.infiniteListImages.controller.lanes[indexLane].scroller.velocity;
		}

		if ('visible' in updatedItemState) {
			if (!!this._animated) {
				plane.visible = updatedItemState.visible;
			}
		}

		if ('opacity' in updatedItemState && typeof updatedItemState.opacity === 'number') {
			if (!!this._animated) {
				plane.uniforms.opacity.value = updatedItemState.opacity;
			}
		}

		if ('transform' in updatedItemState) {
			const transform = updatedItemState.transform;

			if ('scale' in transform) {
				if (!!this._animated) {
					plane.scale.x = transform.scale;
					plane.scale.y = transform.scale;
				}
			}

			if ('origin' in transform) {
				if (transform.origin === 'left center') {
					plane.transformOrigin.x = 0;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				} else if (transform.origin === 'right center') {
					plane.transformOrigin.x = 1;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				} else {
					plane.transformOrigin.x = 0.5;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				}
			}

			if ('translate' in transform) {
				if (typeof transform.translate === 'object') {
					plane.relativeTranslation.x = transform.translate.x;
					plane.relativeTranslation.y = transform.translate.y;
					plane.relativeTranslation.z = transform.translate.z;
				}

				if (typeof transform.translate === 'number') {
					plane.relativeTranslation.x = transform.translate;
				}
			}

			if ('rotate' in transform) {
				if (typeof transform.rotate === 'object') {
					plane.rotation.x = -app.utilities.degrees2Radians(transform.rotate.x);
					plane.rotation.y = -app.utilities.degrees2Radians(transform.rotate.y);
					plane.rotation.z = -app.utilities.degrees2Radians(transform.rotate.z);
				}

				if (typeof transform.rotate === 'number') {
					plane.rotation.z = -app.utilities.degrees2Radians(transform.rotate);
				}
			}
		}
	}

	_onUpdateVisible(visible) {
		if (this.curtains && this.curtains.instance) {
			if (visible) {
				this.curtains.instance.enableDrawing();
			} else {
				this.curtains.instance.disableDrawing();
			}
		}
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
			uniform float uElasticEffect;

			void main() {
				// vec4 vertexPosition = uMVMatrix * vec4(aVertexPosition, 1.0);
				vec3 vertexPosition = aVertexPosition;

				// 1. Speed Effect
				vertexPosition.y -= sin(vertexPosition.x * 2. / (uViewportSizes.y) * PI + PI / 2.0) * uVelocityY * (uPlaneSizes.y / 2.) * uElasticEffect;
				vertexPosition.x += sin(vertexPosition.y * 2. / (uViewportSizes.x) * PI + PI / 2.0) * uVelocityX * (uPlaneSizes.x / 2.) * uElasticEffect;

				// 2. Hover Effect
				vertexPosition.z += sin(vertexPosition.x * (uHoverSegments) + (uTime * 0.03) + uHoverSpeed) * uHoverAmplitude * 0.005;
				vertexPosition.x += sin(vertexPosition.y * (uHoverSegments) + (uTime * 0.03) + uHoverSpeed) * uHoverAmplitude * 0.005;

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
				float distortionEffect = distanceStrength * waveSinusoid * 0.33;

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
			precision mediump float;

			// Variables from vertex shader
			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			// Custom uniforms
			uniform float uOpacity;
			uniform float uTransition;
			uniform sampler2D uSampler0;

			void main() {
				// Apply texture
				vec4 finalColor = texture2D(uSampler0, vTextureCoord);

				// Apply opacity
				finalColor.a = uOpacity;

				// Fake shadows based on vertex position along Z axis
				finalColor.rgb += clamp(vVertexPosition.z, -1.0, 0.0) * 0.75 * uTransition;

				// Fake lights based on vertex position along Z axis
				finalColor.rgb += clamp(vVertexPosition.z, 0.0, 1.0) * 0.75 * uTransition;

				// Display texture
				gl_FragColor = finalColor;
			}
		`;
	}

	_fShaderPassPerspective() {
		return `
			#define PI 3.1415926535897932384626433832795

			precision mediump float;

			// Get our varyings
			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			// Our render texture
			uniform sampler2D uRenderTexture;

			// Custom uniforms
			uniform float uVelocity;
			uniform float uStrength;
			uniform vec2 uViewportSizes;

			void main() {
				vec2 textureCoords = vTextureCoord;
				vec2 point = vec2(0.5, 0.5);

				// distort around scene center
				textureCoords += vec2(point - textureCoords).xy * uStrength * -0.1 * sin(distance(point, textureCoords) * PI + PI / 2.0 ) * -uVelocity;

				// display our render texture, which contains our shader pass frame buffer object content
				gl_FragColor = texture2D(uRenderTexture, textureCoords);
			}
		`;
	}
}

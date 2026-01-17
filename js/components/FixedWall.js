export default class FixedWall extends BaseComponent {
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
				direction: 'vertical',
				duration: '400%',
				scrub: 1,
				matchMedia: '(min-width: 992px)',
				toggleHeaderVisibility: true
			},
			// Component inner elements
			innerElements: {
				fixedWrapper: '.js-fixed-wall__fixed-wrapper',
				list: '.js-fixed-wall__list',
				lanes: '.js-fixed-wall__list-lane',
				items: '.js-fixed-wall__list-item',
				circle: '.js-fixed-wall__button circle'
			}
		});
		this._handlers = {
			progressScene: this._onProgressScene.bind(this),
			toggleScene: this._onToggleScene.bind(this),
			transitionStart: this._onTransitionStart.bind(this)
		};

		this.setup();
	}

	init() {
		this.updateRef('headerRef', 'Header');

		if (this.elements.list[0] && this.elements.lanes.length) {
			this._createInfiniteList();

			this.infiniteList.pluginsReady.then(() => {
				const mq = typeof this.options.matchMedia === 'string' ? this.options.matchMedia : 'all';

				this.mm = gsap.matchMedia();
				this.mm.add(mq, () => {
					this._createFixedScene();
					this._toggleFixedWall(true);

					return () => {
						this._toggleFixedWall(false);

						if (this.elements.circle[0]) {
							gsap.set(this.elements.circle[0], {
								clearProps: 'all'
							});
						}
					};
				});

				this.infiniteList.update();
				this._onProgressScene({ progress: 0.0001 });

				this._attachEvents();
			});
		}
	}

	destroy() {
		if (this.infiniteList) {
			this.infiniteList.destroy();
		}

		if (this.mm && typeof this.mm.kill === 'function') {
			this.mm.kill();
		}

		this._detachEvents();
	}

	_toggleFixedWall(enabled = true) {
		if (enabled) {
			this.element.classList.add('has-fixed-wall');
			this.element.classList.remove('no-fixed-wall');
		} else {
			this.element.classList.add('no-fixed-wall');
			this.element.classList.remove('has-fixed-wall');
		}
	}

	_attachEvents() {
		document.addEventListener('arts/barba/transition/start', this._handlers.transitionStart);
	}

	_detachEvents() {
		document.removeEventListener('arts/barba/transition/start', this._handlers.transitionStart);
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.elements.list[0], {
			direction: this.options.direction,
			listElementsSelector: this.innerSelectors.items,
			multiLane: {
				laneSelector: this.innerSelectors.lanes,
				laneOptionsAttribute: 'data-arts-infinite-list-options'
			},
			matchMedia: this.options.matchMedia,
			autoClone: false,
			loop: false,
			plugins: {
				scroll: false
			},
		});
	}

	_createFixedScene() {
		const config = {
			start: () => `top top`,
			end: () => `bottom+=${this.options.duration} bottom`,
			onUpdate: this._handlers.progressScene,
			pin: this.elements.fixedWrapper,
			pinSpacing: true,
			trigger: this.element,
			invalidateOnRefresh: true,
			scrub: this.options.scrub,
		};

		if (!!this.options.toggleHeaderVisibility && this.headerRef) {
			config.onToggle = this._handlers.toggleScene;
		}

		this.fixedScene = ScrollTrigger.create(config);
	}

	_onProgressScene({ progress } = { progress: 0 }) {
		this.elements.lanes.forEach((el, indexLane) => {
			this.infiniteList.controller.setProgress({
				progress: (indexLane & 1) === 0 ? progress : 1 - progress,
				indexLane,
				animate: false
			});
		});

		if (this.elements.circle[0]) {
			gsap.set(this.elements.circle[0], {
				drawSVG: `0% ${progress * 100}%`,
				rotate: 180 * progress,
				transformOrigin: 'center center'
			});
		}
	}

	_onToggleScene({ isActive }) {
		this.headerRef.toggleHidden(isActive);
	}

	_onTransitionStart() {
		if (this.fixedScene) {
			this.fixedScene.kill(false, false);
			this.fixedScene = null;
		}
	}
}

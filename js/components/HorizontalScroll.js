export default class HorizontalScroll extends BaseComponent {
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
				mode: 'modular',
				toggleInViewClass: 'in-view',
				matchMedia: '(min-width: 992px) and (hover: hover) and (pointer: fine)',
				toggleHeaderVisibility: true,
				lockHeaderSticky: false
			},
			// Component inner elements
			innerElements: {
				wrapper: '.js-horizontal-scroll__wrapper',
				sections: '.js-horizontal-scroll__section'
			},
		});

		this._handlers = {
			matchMedia: this._onMatchMedia.bind(this)
		};
		this.mq = null;

		if (typeof this.options.matchMedia === 'string') {
			this._createMatchMedia();
		}

		this.setup();
		this._attachEvents();
	}

	init() {
		this.updateRef('headerRef', 'Header');
	}

	update() {
		if (this.horizontalScroll && this.horizontalScroll.enabled) {
			this.horizontalScroll.update();
		}

		ScrollTrigger.refresh();
	}

	destroy() {
		if (this.horizontalScroll) {
			this.horizontalScroll.destroy();
			this.horizontalScroll = null;
		}

		if (this.stScrub) {
			this.stScrub.kill();
		}

		if (this.mq) {
			if (typeof this.mq.removeEventListener === 'function') {
				this.mq.removeEventListener('change', this._handlers.matchMedia);
			} else {
				this.mq.removeListener(this._handlers.matchMedia);
			}
			this.mq = null;
		}

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	// _onResizeHorizontal() {
	// 	if (this.mounted) {
	// 		this.innerTriggers.forEach((st) => {
	// 			st.refresh();
	// 		});
	// 	}

	// 	this.update();
	// }

	mount() {
		return new Promise((resolve) => {
			// console.log(`Mounting component: ${this.name}...`);

			this._createHorizontalScroll();

			if (this.mounted || !this.loadInnerComponents) {
				this.mounted = true;

				resolve(true);
			} else {
				app.componentsManager.instances.disposable.push(this);

				Promise.all(app.componentsManager.init({
					storage: this.components,
					scope: this.element,
					parent: this,
					nameAttribute: 'data-arts-component-name',
					optionsAttribute: 'data-arts-component-options',
				}))
					.then(() => {
						// this.innerTriggers = ScrollTrigger.getAll().filter((st) => st.trigger !== this.element && this.element.contains(st.trigger));

						// this.resizeObserver = new ResizeObserver(app.utilities.debounce(this._onResizeHorizontal.bind(this), app.utilities.getDebounceTime()));

						// this.resizeObserver.observe(this.element);

						this._initSplitText();
						this._initLazyMedia();
						this.mounted = true;

						resolve(true);
					});
			}
		});
	}

	getScrubAnimation() {
		const config = {
			trigger: this.element,
			start: () => `top top`,
			end: () => `bottom bottom`,
			scrub: true,
			matchMedia: this.options.matchMedia,
			onToggle: (self) => {
				this.updateRef('headerRef', 'Header');

				if (!!this.options.toggleHeaderVisibility) {
					this.headerRef.toggleHidden(self.isActive);
				}

				if (!!this.options.lockHeaderSticky) {
					this.headerRef.lockSticky(self.isActive);
				}
			}
		};

		return config;
	}

	_createHorizontalScroll() {
		this.horizontalScroll = new ArtsHorizontalScroll(this.element, {
			mode: this.options.mode,
			wrapperElementSelector: this.innerSelectors.wrapper,
			sectionElementsSelector: this.innerSelectors.sections,
			matchMedia: this.options.matchMedia,
			toggleInViewClass: this.options.toggleInViewClass
		});
	}

	_createMatchMedia() {
		this.mq = window.matchMedia(this.options.matchMedia);

		if (typeof this.mq.addEventListener === 'function') {
			this.mq.addEventListener('change', this._handlers.matchMedia);
		} else {
			this.mq.addListener(this._handlers.matchMedia);
		}
	}

	_onMatchMedia(event) {
		if (!event.matches) {
			if (this.headerRef) {
				if (!!this.options.toggleHeaderVisibility) {
					this.headerRef.toggleHidden(false);
				}

				if (!!this.options.lockHeaderSticky) {
					this.headerRef.lockSticky(false);
				}
			}

		} else {
			ScrollTrigger.refresh(false);
		}
	}

	_attachEvents() {
		document.addEventListener('arts/barba/transition/end', () => {
			this.update();
		}, {
			once: true
		});
	}
}

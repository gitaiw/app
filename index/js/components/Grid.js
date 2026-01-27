export default class Grid extends BaseComponent {
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
				filterSticky: {
					trigger: 'self',
					offsetTop: 0,
					offsetHeaderHeight: false,
					matchMedia: '(min-width: 992px)',
					toggleStickyClass: 'sticking',
					toggleStickyColorTheme: false,
					toggleHeaderVisibility: false,
					autoScrollToGrid: false
				},
				filterItemActiveClass: 'filter__item_active',
				filterItemAttribute: 'data-filter',
				filterDrawEffect: true
			},
			// Component inner elements
			innerElements: {
				container: '.js-grid__container',
				gridItem: '.js-grid__item',
				gridColumn: '.js-grid__col-grid',
				filterColumn: '.js-grid__col-filter',
				gridFilter: '.js-grid__filter',
				gridFilterDropdown: '.js-grid__filter-dropdown',
				gridFilterItems: '.js-grid__filter-item',
				gridFilterItemsInner: '.js-grid__filter-item-inner'
			}
		});
		this._handlers = {
			clickFilterItem: this._onClickFilterItem.bind(this),
			changeDropdown: this._onChangeDropdown.bind(this),
			arrangeComplete: ScrollTrigger.refresh.bind(ScrollTrigger),
			animationStart: this._onAnimationStart.bind(this)
		};

		this.shapes = [];

		this.setup();
	}

	init() {
		this.updateRef('headerRef', 'Header');
		this.savedFilterColumnColorTheme = '';

		if (this.elements.filterColumn[0]) {
			this.savedFilterColumnColorTheme = this.elements.filterColumn[0].getAttribute('data-arts-color-theme');
		}

		this.tl = gsap.timeline({
			defaults: {
				ease: 'power2.inOut',
				duration: 0.6
			}
		});

		this._createGrid();
		this._attachEvents();

		if (!!this.options.filterDrawEffect && !this._hasAnimationScene()) {
			this._setHoverDrawEffect();
		}

		if (!!this.options.filterSticky) {
			const mq = typeof this.options.filterSticky.matchMedia === 'string' ? this.options.filterSticky.matchMedia : 'all';

			this.mm = gsap.matchMedia();
			this.mm.add(mq, () => {
				this._createStickyFilterScene();

				return () => {
					this._setSticky(false);
					ScrollTrigger.refresh(false);
				};
			});
		}
	}

	destroy() {
		this._detachEvents();

		if (this.mm && typeof this.mm.kill === 'function') {
			this.mm.kill();
		}

		this.isotope.destroy();
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			this.element.addEventListener('animation/start', this._handlers.animationStart, {
				once: true
			});

			resolve(true);
		});
	}

	_attachEvents() {
		this.element.addEventListener('click', this._handlers.clickFilterItem, true);
		this.element.addEventListener('change', this._handlers.changeDropdown);

		this.resizeInstance = new ResizeObserver(app.utilities.debounce(this._updateGrid.bind(this), app.utilities.getDebounceTime()));
		this.resizeInstance.observe(this.element);

		if (this.isotope) {
			this.isotope.on('arrangeComplete', this._handlers.arrangeComplete);
		}
	}

	_detachEvents() {
		if (this.resizeInstance) {
			this.resizeInstance.unobserve(this.element);
		}

		if (this.isotope) {
			this.isotope.off('arrangeComplete', this._handlers.arrangeComplete);
		}

		this.element.removeEventListener('click', this._handlers.clickFilterItem);
	}

	_createGrid() {
		this.isotope = new Isotope(this.elements.container[0], {
			itemSelector: this.innerSelectors.gridItem,
			percentPosition: true,
			horizontalOrder: true,
			filter: this._getActiveFilter()
		});
	}

	_createStickyFilterScene() {
		let stickyTopOffset = 0;

		if (typeof this.options.filterSticky.offsetTop === 'number' || typeof this.options.filterSticky.offsetTop === 'string') {
			stickyTopOffset = parseInt(this.options.filterSticky.offsetTop.toString());
		}

		this.stickyScene = ScrollTrigger.create({
			onEnter: this._setSticky.bind(this, true),
			onEnterBack: this._setSticky.bind(this, true),
			onLeave: this._setSticky.bind(this, false),
			onLeaveBack: this._setSticky.bind(this, false),
			start: () => {
				let offset = 0;

				offset += stickyTopOffset;
				offset += !!this.options.filterSticky.offsetHeaderHeight && app.utilities.getHeaderHeight();

				return `top top+=${offset}`;
			},
			end: () => {
				let offset = 0;

				offset += stickyTopOffset;

				if (this.elements.gridFilter[0]) {
					offset += this.elements.gridFilter[0].offsetHeight;
				}

				offset += !!this.options.filterSticky.offsetHeaderHeight && app.utilities.getHeaderHeight();

				return `bottom-=${offset} top`;
			},
			trigger: this.options.filterSticky.trigger === 'grid' ? this.elements.gridColumn[0] : this.element,
			pin: this.elements.filterColumn[0],
		});
	}

	_setSticky(sticking = true) {
		if (this.elements.filterColumn.length) {
			if (typeof this.options.filterSticky.toggleStickyClass === 'string') {
				app.utilities.toggleClasses(
					this.elements.filterColumn[0],
					this.options.filterSticky.toggleStickyClass,
					sticking
				);
			}

			if (typeof this.options.filterSticky.toggleStickyColorTheme === 'string') {
				if (sticking) {
					this.elements.filterColumn[0].setAttribute('data-arts-color-theme', this.options.filterSticky.toggleStickyColorTheme);
				} else {
					if (this.savedFilterColumnColorTheme) {
						this.elements.filterColumn[0].setAttribute('data-arts-color-theme', this.savedFilterColumnColorTheme);
					} else {
						this.elements.filterColumn[0].removeAttribute('data-arts-color-theme');
					}
				}
			}

			if (!!this.options.filterSticky.toggleHeaderVisibility && this.headerRef) {
				this.headerRef.toggleHidden(sticking);
			}
		}
	}

	_getActiveFilter() {
		const activeFilterItem = this._getActiveFilterItem();

		return this._getFilterItemValue(activeFilterItem);
	}

	_getFilterItemValue(el) {
		if (el instanceof HTMLElement) {
			return el.getAttribute(this.options.filterItemAttribute);
		}

		return '';
	}

	_getActiveFilterItem() {
		const filteredArray = this.elements.gridFilterItems.filter(el => el.classList.contains(`${this.options.filterItemActiveClass}`));

		if (filteredArray.length) {
			return filteredArray[0];
		}
	}

	_setActiveFilterItem(el, active = false) {
		if (el instanceof HTMLElement) {
			el.classList.toggle(this.options.filterItemActiveClass, active);

			const ellipse = el.querySelector('ellipse');

			if (active && this.elements.gridFilterDropdown[0]) {
				this.elements.gridFilterDropdown[0].value = this._getFilterItemValue(el);
			}

			if (ellipse) {
				if (active) {
					this.tl.to(ellipse, {
						drawSVG: '100% 0%'
					}, 'start');
				} else {
					this.tl.to(ellipse, {
						drawSVG: '100% 100%',
					}, 'start');
				}
			}
		}
	}

	_onClickFilterItem(event) {
		const filterItem = event.target.closest(this.innerSelectors.gridFilterItems);

		if (filterItem) {
			this.tl.clear();

			this.elements.gridFilterItems.forEach(el => {
				this._setActiveFilterItem(el, el === filterItem);
			});

			this._arrangeGrid();

			if (!!this.options.filterSticky && !!this.options.filterSticky.autoScrollToGrid) {
				this._scrollToGrid();
			}
		}
	}

	_onChangeDropdown(event) {
		const dropdownEl = event.target.closest(this.innerSelectors.gridFilterDropdown);

		if (dropdownEl) {
			const filteredArray = this.elements.gridFilterItems.filter(el => el.getAttribute(this.options.filterItemAttribute) === dropdownEl.value);

			if (filteredArray[0]) {
				filteredArray[0].click();
			}
		}
	}

	_arrangeGrid() {
		this.isotope.arrange({
			filter: this._getActiveFilter()
		});
	}

	_scrollToGrid() {
		if (this.stickyScene && this.stickyScene.isActive) {
			app.utilities.scrollTo({
				target: this.elements.gridColumn[0],
				duration: typeof this.options.filterSticky.autoScrollToGrid === 'number' ? this.options.filterSticky.autoScrollToGrid : 0.6
			});
		}
	}

	_updateGrid() {
		this.isotope.layout();
		ScrollTrigger.refresh();
	}

	_setHoverDrawEffect(cb) {
		this.elements.gridFilterItemsInner.forEach((el) => {
			this.shapes.push(this._addSVGShape(el));

			// draw current item
			const item = el.closest(this.innerSelectors.gridFilterItems);
			const shouldDraw = item && item.classList.contains(this.options.filterItemActiveClass);

			this._setEllipse(el, shouldDraw, cb);
		});
	}

	_addSVGShape(el) {
		if (el && typeof app.options.circleTemplate === 'string') {
			return el.insertAdjacentHTML('beforeend', app.options.circleTemplate);
		}
	}

	_setEllipse(element, drawn = true, cb) {
		if (element) {
			const ellipse = element.querySelector('ellipse');

			if (ellipse) {
				gsap.set(ellipse, {
					drawSVG: drawn ? '100%' : '0%'
				});

				if (typeof cb === 'function') {
					cb(ellipse, drawn);
				}
			}
		}
	}

	_onAnimationStart() {
		this._setHoverDrawEffect((ellipse, drawn) => {
			if (drawn) {
				this.tl.fromTo(ellipse, {
					drawSVG: '0%'
				}, {
					delay: 0.6,
					duration: 1.2,
					ease: 'expo.inOut',
					drawSVG: '100% 0%'
				}, 'start');
			}
		});
	}
}

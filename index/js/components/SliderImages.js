export default class SliderImages extends BaseComponent {
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
				drag: {
					label: 'Drag',
					arrowsDistance: 50,
					scale: 1.5,
					hideNative: true,
					toggleClass: 'infinite-list_mouse-drag',
					color: 'var(--ui-element-color-light-theme)',
					background: 'var(--color-accent-dark-theme)',
				},
				preventScroll: false,
				direction: 'horizontal',
				scroll: app.options.virtualScroll,
				loop: true,
				autoCenterFirstItem: true,
				type: 'touch,pointer',
				toggleScrollingClass: 'infinite-list_scrolling',
				toggleDraggingClass: 'infinite-list_dragging',
				togglePressedClass: 'infinite-list_pressed',
				snapOnRelease: {
					keyboard: false,
					toggleActiveItemClass: 'active',
					removeActiveClassOnInteraction: false
				},
				marquee: {
					speed: 0.3,
					onHoverSpeed: 0
				},
				currentClass: 'current'
			},
			// Component inner elements
			innerElements: {
				items: '.js-slider-images__item'
			},
		});

		this._handlers = {
			resize: app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime())
		};

		this.setup();
	}

	init() {
		this.updateRef('cursorRef', 'CursorFollower');

		this._createInfiniteList();
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();

		if (this.infiniteList) {
			this.infiniteList.destroy();
		}
	}

	_attachEvents() {
		if (!!this.options.drag) {
			if (typeof this.options.drag.toggleClass === 'string') {
				this.element.classList.add(this.options.drag.toggleClass);
			}

			this._attachDragListeners();
		}

		window.addEventListener('resize', this._handlers.resize);
	}

	_detachEvents() {
		window.removeEventListener('resize', this._handlers.resize);
	}

	_attachDragListeners() {
		this.infiniteList.controller.on('dragPressed', (pressed) => {
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
						className: this.options.drag.className || '',
						hideNative: this.options.drag.hideNative,
						color: this.options.drag.color,
						background: this.options.drag.background,
					});
				} else {
					this.cursorRef.instance.set({
						autoReset: true,
					});
					this.cursorRef.instance.reset();
				}
			}
		});
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.element, {
			direction: this.options.direction,
			listElementsSelector: '.js-slider-images__item',
			multiLane: {
				laneSelector: '.js-slider-images__lane',
				laneOptionsAttribute: 'data-lane-options'
			},
			autoCenterFirstItem: this.options.autoCenterFirstItem,
			autoClone: this.options.loop,
			loop: this.options.loop,
			scroll: this.options.scroll,
			plugins: {
				marquee: this.options.marquee,
				scroll: {
					type: this.options.type,
					toggleScrollingClass: this.options.toggleScrollingClass,
					toggleDraggingClass: this.options.toggleDraggingClass,
					togglePressedClass: this.options.togglePressedClass,
					snapOnRelease: this.options.snapOnRelease,
					preventDefault: this.options.preventScroll
				},
				// renderer: true,
				// speedEffect: this.options.speedEffect,
				// progressEffect: this.options.progressEffect,
			},
			// matchMedia: '(min-width: 1024px)',
			// resizeObserver: true
		});
	}

	_adjustSliderHeight() {
		const tl = gsap.timeline({
			onComplete: () => {
				ScrollTrigger.refresh(true);
			}
		});

		let maxHeight = 0;

		this.elements.items.forEach((el) => {
			if (el.offsetHeight > maxHeight) {
				maxHeight = el.offsetHeight;
			}
		});

		tl.to(this.element, {
			maxHeight: maxHeight,
			duration: 1.2
		});

		return tl;
	}

	_onResize() {
		this._adjustSliderHeight();
	}
}

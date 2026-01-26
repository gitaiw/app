export default class MenuClassic extends BaseComponent {
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
			defaults: {
				hoverDrawEffect: true
			},
			innerElements: {
				topLevelElements: ':scope > li',
				topLevelLinks: ':scope > li:not(.menu-item-has-children) > a',
				topLevelCurrentElement: ':scope > li.current-menu-item:not(.menu-item-has-children)',
				topLevelCurrentLink: ':scope > li.current-menu-item:not(.menu-item-has-children) > a'
			}
		});

		this._handlers = {
			hoverIn: this._onMouseEnter.bind(this),
			hoverOut: this._onMouseLeave.bind(this),
			click: this._onClick.bind(this),
			classChange: this._onClassChange.bind(this)
		};

		this.shapes = [];

		this.tl = gsap.timeline({
			defaults: {
				ease: 'power2.inOut',
				duration: 0.6
			}
		});

		this.setup();
	}

	init() {
		if (!!this.options.hoverDrawEffect) {
			this._setHoverDrawEffect();
			this._observeChanges();
		}
	}

	destroy() {
		if (!!this.options.hoverDrawEffect) {
			this.tl.clear();
			this._detachEvents();
			this._removeShapes();
			this._unObserveChanges();
		}
	}

	_setHoverDrawEffect() {
		this.elements.topLevelLinks.forEach((el) => {
			this.shapes.push(this._addSVGShape(el));
			// draw current item
			const shouldDraw = this.elements.topLevelCurrentLink[0] && el === this.elements.topLevelCurrentLink[0] ? true : false;

			this._setEllipse(el, shouldDraw);

			app.hoverEffect.attachEvents(el, this._handlers.hoverIn, this._handlers.hoverOut);
			el.addEventListener('click', this._handlers.click, true);
		});
	}

	_addSVGShape(el) {
		if (el && typeof app.options.circleTemplate === 'string') {
			return el.insertAdjacentHTML('beforeend', app.options.circleTemplate);
		}
	}

	_setEllipse(element, drawn = true) {
		if (element) {
			const ellipse = element.querySelector('ellipse');

			if (ellipse) {
				gsap.set(ellipse, {
					drawSVG: drawn ? '100%' : '0%'
				});
			}
		}
	}

	_onMouseEnter(event) {
		const target = event.target;

		if (target instanceof HTMLElement) {
			const link = target.closest('a');

			if (link) {
				const
					otherEllipses = [],
					currentEllipse = event.target.querySelector('ellipse');

				this.tl.clear();

				this.elements.topLevelLinks.forEach((element) => {
					if (event.target !== element) {
						const ellipse = element.querySelector('ellipse');

						if (ellipse) {
							otherEllipses.push(ellipse);
						}
					}
				});

				if (currentEllipse) {
					this.tl.to(currentEllipse, {
						drawSVG: '100% 0%'
					}, 'start');
				}

				if (otherEllipses.length) {
					this.tl.to(otherEllipses, {
						drawSVG: '100% 100%',
					}, 'start');
				}
			}
		}
	}

	_onClick(event) {
		if (app.utilities.shouldPreventLinkClick(event)) {
			return;
		}

		event.target.closest('li').classList.add('current-menu-item');
	}

	_onMouseLeave() {
		const otherEllipses = [];

		this.elements.topLevelLinks
			.filter(element => element !== this.elements.topLevelCurrentLink[0])
			.forEach((element) => {
				const ellipse = element.querySelector('ellipse');

				if (ellipse) {
					otherEllipses.push(ellipse);
				}
			});

		this.tl.clear();

		if (this.elements.topLevelCurrentLink[0]) {
			const currentEllipse = this.elements.topLevelCurrentLink[0].querySelector('ellipse');

			this.tl
				.to(currentEllipse, {
					drawSVG: '100% 0%'
				}, 'start');
		}

		if (otherEllipses.length) {
			this.tl
				.to(otherEllipses, {
					drawSVG: '100% 100%',
				}, 'start')
				.set(otherEllipses, {
					drawSVG: '0%'
				});
		}
	}

	_detachEvents() {
		this.elements.topLevelLinks.forEach((el) => {
			app.hoverEffect.detachEvents(el, this._handlers.hoverIn, this._handlers.hoverOut);
			el.removeEventListener('click', this._handlers.click);
		});
	}

	_removeShapes() {
		this.shapes.forEach((el) => {
			if (el instanceof HTMLElement) {
				el.remove();
			}
		});

		this.shapes = [];
	}

	_observeChanges() {
		this.observer = new MutationObserver(this._handlers.classChange);

		this.elements.topLevelElements.forEach((el) => {
			this.observer.observe(el, {
				attributes: true,
				attributeFilter: ['class'],
				attributeOldValue: true,
			});
		});
	}

	_unObserveChanges() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	_onClassChange(mutations) {
		mutations.forEach((mutationRecord) => {
			const target = mutationRecord.target;

			if (target.classList.contains('current-menu-item')) {
				this.tl.clear();

				this.elements.topLevelCurrentElement[0] = target;
				this.elements.topLevelCurrentLink[0] = target.querySelector(':scope > a');

				const
					otherEllipses = [],
					currentEllipse = target.querySelector('ellipse');

				this.elements.topLevelElements.forEach((element) => {
					if (target !== element) {
						const ellipse = element.querySelector('ellipse');

						if (ellipse) {
							otherEllipses.push(ellipse);
						}
					}
				});

				if (currentEllipse) {
					this.tl.to(currentEllipse, {
						drawSVG: '100% 0%'
					}, 'start');
				}

				if (otherEllipses.length) {
					this.tl.to(otherEllipses, {
						drawSVG: '100% 100%',
					}, 'start');
				}
			}

			if (!target.classList.contains('current-menu-item') && mutationRecord.oldValue.includes('current-menu-item')) {
				this.tl.clear();

				this.elements.topLevelCurrentElement[0] = this.element.querySelector(':scope > li.current-menu-item:not(.menu-item-has-children)');
				this.elements.topLevelCurrentLink[0] = this.element.querySelector(':scope > li.current-menu-item:not(.menu-item-has-children) > a');

				const
					currentEllipse = target.querySelector('ellipse');

				this.tl
					.to(currentEllipse, {
						drawSVG: '100% 100%',
					}, 'start')
					.set(currentEllipse, {
						drawSVG: '0%'
					});
			}
		})
	}
}

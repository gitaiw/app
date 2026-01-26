export default class MarqueeHeader extends BaseComponent {
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
				loop: true,
				speed: 0.5,
				onHoverSpeed: 0.1,
				onScrollSpeed: false,
				onScrollInverseDirection: false,
				delimiter: '&nbsp;&nbsp;/&nbsp;&nbsp;'
			},
			// Component inner elements
			innerElements: {
				lanes: '.js-marquee-header__list-lane',
				items: '.js-marquee-header__list-item',
				labels: '.js-marquee-header__label'
			}
		});

		this._handlers = {
			afterResize: this._onAfterResize.bind(this)
		};

		this.clamp = gsap.utils.clamp(-10, 10);

		this.setup();
	}

	init() {
		this._addDelimiter();
		this._createInfiniteList();
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();

		if (this.infiniteList) {
			this.infiniteList.destroy();
		}
	}

	getScrubAnimation() {
		if (typeof this.options.onScrollSpeed === 'number') {
			const proxy = {
				velocity: this.options.speed
			};

			const velocityWatcher = ScrollTrigger.getById('velocityWatcher');

			const config = {
				trigger: this.element,
				once: false,
				invalidateOnRefresh: true,
				onUpdate: (self) => {
					let velocity = this.clamp(Math.abs(velocityWatcher.getVelocity()) / 300) * this.options.onScrollSpeed;

					if (velocity > proxy.velocity) {
						proxy.velocity = velocity * (this.options.onScrollInverseDirection ? self.direction : 1);

						gsap.to(proxy, {
							velocity: this.options.speed,
							duration: 0.6,
							ease: 'none',
							overwrite: true,
							onUpdate: () => {
								if (this.infiniteList && 'marquee' in this.infiniteList.plugins) {
									this.infiniteList.plugins.marquee.setNormalSpeed(proxy.velocity);
								}
							}
						});
					}
				}
			}

			return config;
		}
	}

	_attachEvents() {
		this.infiniteList.controller.on('afterResize', this._handlers.afterResize);
	}

	_detachEvents() {
		this.infiniteList.controller.off('afterResize', this._handlers.afterResize);
	}

	_addDelimiter() {
		if (typeof this.options.delimiter === 'string') {
			this.elements.labels.forEach((heading) => {
				heading.innerHTML = `<span class="marquee-heading">${heading.innerHTML}</span>`;

				if (this.options.delimiter.length) {
					heading.innerHTML += `<span class="marquee-delimiter">${this.options.delimiter}</span>`;
				}
			});
		}
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.element, {
			direction: 'horizontal',
			listElementsSelector: this.innerSelectors.items,
			mapWheelEventYtoX: false,
			multiLane: {
				laneSelector: this.innerSelectors.lanes,
				laneOptionsAttribute: 'data-arts-infinite-list-options'
			},
			autoClone: this.options.loop,
			loop: this.options.loop,
			plugins: {
				marquee: {
					speed: this.options.speed,
					onHoverSpeed: this.options.onHoverSpeed
				},
				scroll: false,
			},
		});
	}

	_onAfterResize() {
		if (app.lazy && typeof app.lazy.update === 'function') {
			app.lazy.update();
		}
	}
}

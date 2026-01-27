export default class ScreensWall extends BaseComponent {
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
				marquee: {
					speed: 0.5,
					onHoverSpeed: 0.5
				}
			},
			// Component inner elements
			innerElements: {
				container: '.js-screens-wall__list-container',
				lanes: '.js-screens-wall__list-lane',
				items: '.js-screens-wall__list-item',
			}
		});

		this.setup();
	}

	init() {
		this._createInfiniteList();

		if (!this._hasAnimationScene()) {
			this._initMarquee();
		}
	}

	destroy() {
		if (this.infiniteList) {
			this.infiniteList.destroy();
		}
	}

	getRevealAnimation() {
		const tl = gsap.timeline({
			paused: true
		})

		if (this.elements.items.length) {
			tl.animateMask(this.elements.items, {
				animateFrom: 'bottom',
				duration: 2,
				ease: 'expo.inOut',
				stagger: distributeByPosition({
					from: 'center',
					amount: 0.5
				})
			});
		}

		tl.add(() => {
			this._initMarquee();
		}, '<50%');

		return tl;
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.elements.container[0], {
			direction: 'vertical',
			mapWheelEventYtoX: false,
			listElementsSelector: this.innerSelectors.items,
			multiLane: {
				laneSelector: this.innerSelectors.lanes,
				laneOptionsAttribute: 'data-arts-infinite-list-options'
			},
			autoClone: true,
			loop: true,
			plugins: {
				marquee: typeof this.options.marquee === 'object' ? {
					autoInit: false,
					...this.options.marquee
				} : false,
				scroll: false,
			}
		});
	}

	_initMarquee() {
		if (this.infiniteList) {
			this.infiniteList.pluginsReady.then(() => {
				if (this.infiniteList.plugins.marquee) {
					this.infiniteList.update();
					this.infiniteList.plugins.marquee.init();
				}
			});
		}
	}
}

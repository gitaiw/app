export default class FixedHeader extends BaseComponent {
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
				matchMedia: '(min-width: 576px)'
			},
			// Component inner elements
			innerElements: {
				fixedWrapper: '.js-fixed-header__fixed-wrapper'
			}
		});

		this.setup();
	}

	init() {
		const mq = typeof this.options.matchMedia === 'string' ? this.options.matchMedia : 'all';

		this.mm = gsap.matchMedia();
		this.mm.add(mq, () => {
			this._createFixedScene();
		});
	}

	destroy() {
		if (this.mm && typeof this.mm.kill === 'function') {
			this.mm.kill();
		}
	}

	_createFixedScene() {
		const fixedWrapper = this.element.querySelector(this.innerSelectors.fixedWrapper);

		this.fixedScene = ScrollTrigger.create({
			start: () => `top center-=${fixedWrapper.offsetHeight}`,
			end: () => `bottom bottom`,
			pin: fixedWrapper,
			pinSpacing: false,
			trigger: this.element,
			invalidateOnRefresh: true,
			scrub: true
		});
	}
}

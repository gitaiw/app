export default class Content extends BaseComponent {
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

			},
			// Component inner elements
			innerElements: {

			}
		});

		this.setup();
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => {
					resolve(true);
				}
			});

		});
	}

	getRevealAnimation() {
		const tl = gsap.timeline({
			paused: true
		});

		return tl;
	}
}

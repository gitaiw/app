export default class ArcImages extends BaseComponent {
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
				loop: false,
				minCloneLoopRounds: 1,
				maxCloneLoopRounds: 1,
				progressEffect: {
					preset: 'arc',
					intensity: 0.4
				},
			},
			// Component inner elements
			innerElements: {
				lanes: '.js-arc-images__list-lane',
				items: '.js-arc-images__list-item'
			}
		});
		this._handlers = {
			progressScene: this._onProgressScene.bind(this),
		};

		this.setup();
	}

	init() {
		this._createInfiniteList();
		this._animateOnScroll();

		if (this.infiniteList) {
			this.infiniteList.pluginsReady.then(() => {
				this.infiniteList.update();
				this._onProgressScene({ progress: 0.0001 });
			});
		}
	}

	destroy() {
		if (this.infiniteList) {
			this.infiniteList.destroy();
		}

		if (this.animationScroll && typeof this.animationScroll.kill === 'function') {
			this.animationScroll.kill();
		}
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.element, {
			direction: 'horizontal',
			listElementsSelector: this.innerSelectors.items,
			multiLane: {
				laneSelector: this.innerSelectors.lanes,
				laneOptionsAttribute: 'data-arts-infinite-list-options'
			},
			autoClone: this.options.loop,
			loop: this.options.loop,
			minCloneLoopRounds: this.options.minCloneLoopRounds,
			maxCloneLoopRounds: this.options.maxCloneLoopRounds,
			plugins: {
				scroll: false,
				speedEffect: this.options.speedEffect,
				progressEffect: this.options.progressEffect,
			},
		});
	}

	_animateOnScroll() {
		this.animationScroll = ScrollTrigger.create({
			trigger: this.element,
			start: () => `top+=10% bottom`,
			end: () => `bottom+=20% top`,
			onUpdate: this._handlers.progressScene,
			scrub: 1,
		});
	}

	_onProgressScene({ progress } = { progress: 0 }) {
		this.infiniteList.controller.setProgress(progress);
	}
}

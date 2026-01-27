export default class SplitCounter extends BaseComponent {
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
				stagger: 0.02
			},
			// Component inner elements
			innerElements: {
				lanes: '.js-split-counter__lane'
			},
		});

		this._handlers = {
			resize: this._onResize.bind(this)
		};
		this._current = 0;
		this.lanes = [];
		this.tl = gsap.timeline({
			defaults: {
				ease: 'expo.inOut',
				duration: 0.6
			}
		});

		this.setup();
	}

	init() {
		this._addNumbers();
		this._setNumbers();
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();
		this.tl.clear().kill();
		this._removeNumbers();
	}

	_attachEvents() {
		this.resizeInstance = new ResizeObserver(app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime()));

		this.lanes.forEach((lane, index) => {
			lane.forEach((number) => {
				this.resizeInstance.observe(number.element);
			});
		});
		this.resizeInstance.observe(this.element);
	}

	_detachEvents() {
		if (this.resizeInstance) {
			this.resizeInstance.disconnect();
		}
	}

	_onResize() {
		this._setNumbers();
	}

	_addNumbers() {
		this.elements.lanes.forEach((lane, index) => {
			let
				maxWidth = 0,
				maxHeight = 0;

			this.lanes[index] = [];

			for (let num = 0; num <= 9; num++) {
				const
					numberEl = document.createElement('span'),
					content = num.toString();

				numberEl.dataset['number'] = content;
				numberEl.innerHTML = content;

				lane.appendChild(numberEl);

				if (numberEl.offsetWidth > maxWidth) {
					maxWidth = numberEl.offsetWidth;
				}

				if (numberEl.offsetHeight > maxHeight) {
					maxHeight = numberEl.offsetHeight;
				}

				gsap.set(numberEl, {
					position: 'absolute',
					y: num === 0 ? '0%' : '100%'
				});

				this.lanes[index].push({
					element: numberEl,
					digit: num,
					animating: false,
					progress: num === 0 ? 1 : 0
				});
			}

			gsap.set(this.elements.lanes[index], {
				width: maxWidth,
				height: maxHeight,
			});
		});
	}

	_removeNumbers() {
		this.elements.lanes.forEach((lane, index) => {
			lane.innerHTML = '';
			lane.removeAttribute('style');
			this.lanes[index] = [];
		});
	}

	_setNumbers() {
		this.lanes.forEach((lane, index) => {
			let
				maxWidth = 0,
				maxHeight = 0;

			gsap.set(this.elements.lanes[index], {
				clearProps: 'width,height'
			});

			lane.forEach((number) => {
				if (number.element.offsetWidth > maxWidth) {
					maxWidth = number.element.offsetWidth;
				}

				if (number.element.offsetHeight > maxHeight) {
					maxHeight = number.element.offsetHeight;
				}
			})

			gsap.set(this.elements.lanes[index], {
				width: maxWidth,
				height: maxHeight,
			});
		});
	}

	get current() {
		return this._current;
	}

	set current(newCurrent) {
		if (newCurrent !== this.current) {
			this.tl.clear();

			this._updateNumber(newCurrent);
		}

		this._current = newCurrent;
	}

	_updateNumber(number) {
		const
			align = typeof this.options.stagger === 'number' ? `<${this.options.stagger}` : `<`,
			self = this,
			oldDigits = this._getDigitsArrayFromNumber(this.current),
			newDigits = this._getDigitsArrayFromNumber(number);

		if (number === null) {
			oldDigits.forEach((digit, index) => {
				this.tl
					.to(this.lanes[index][oldDigits[index]].element, {
						y: '-103%',
					}, align);
			});
		} else {
			oldDigits.forEach((digit, index) => {
				if (oldDigits[index] !== newDigits[index]) {

					const previouslyAnimatedElements = this.lanes[index].filter(digit => !!digit.animating);

					if (previouslyAnimatedElements.length) {
						previouslyAnimatedElements.forEach((digit) => {
							const currentProgress = digit.progress;

							this.tl
								.to(digit.element, {
									y: currentProgress < 1 && currentProgress > 0.5 ? '-103%' : '103%',
									onStart: () => {
										digit.animating = true;
									},
									onUpdate: function () {
										digit.progress = this.progress();
									},
									onComplete: () => {
										digit.animating = false;
										digit.progress = 0;

										gsap.set(digit.element, {
											y: '103%'
										});
									}
								}, align);
						});
					}

					const currentProgress = this.lanes[index][oldDigits[index]].progress;

					this.tl
						.to(this.lanes[index][oldDigits[index]].element, {
							y: currentProgress < 0.5 && currentProgress !== 0 ? '103%' : '-103%',
							onStart: () => {
								this.lanes[index][oldDigits[index]].animating = true;
							},
							onUpdate: function () {
								self.lanes[index][oldDigits[index]].progress = this.progress();
							},
							onComplete: () => {
								this.lanes[index][oldDigits[index]].animating = false;

								gsap.set(this.lanes[index][oldDigits[index]].element, {
									y: '103%'
								});
								this.lanes[index][oldDigits[index]].progress = 0;
							}
						}, align)
						.to(this.lanes[index][newDigits[index]].element, {
							y: '0%',
							onStart: () => {
								this.lanes[index][newDigits[index]].animating = true;
							},
							onUpdate: function () {
								self.lanes[index][newDigits[index]].progress = this.progress();
							},
							onComplete: () => {
								this.lanes[index][newDigits[index]].animating = false;
							}
						}, align);
				}
			});
		}
	}

	_getDigitsArrayFromNumber(number) {
		if (number < 10) {
			return [0, number];
		} else {
			return number.toString().split('').map(Number);
		}
	}
}

export default class SliderFullpageBackgroundsSlide extends SliderFullpageBase {
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
			element
		});
	}

	_setMasks(hasAnimationScene) {
		this.elementsFirstSlide.masksOuter.forEach((el, index) => {
			if (hasAnimationScene) {
				gsap.effects.hideMask(el, {
					duration: 0,
					clearProps: '',
				});
			}
		});

		this.elementsFirstSlide.masksInner.forEach((el, index) => {
			if (hasAnimationScene) {
				gsap.set(el, {
					scale: 1.2,
					transformOrigin: 'center center'
				});
			}
		});
	}

	getRevealAnimation() {
		const duration = 1.2;

		const tl = gsap.timeline({
			paused: true,
			onStart: () => {
				this._lockInteraction(true);
			},
			defaults: {
				duration,
				ease: 'power3.inOut'
			}
		})
			.set(this.elementsFirstSlide.sections, {
				autoAlpha: 1,
			})
			.add([
				gsap.effects.animateMask(this.elementsFirstSlide.masksOuter, {
					duration,
					stagger: 0.1,
				}),
				gsap.to(this.elementsFirstSlide.masksInner, {
					transformOrigin: 'center center',
					scale: 1,
					stagger: 0.1,
					duration,
				})
			])
			.add([
				gsap.effects.animateLines(this.elementsFirstSlide.subheadings, {
					duration: this.options.transitionDuration,
					stagger: {
						from: 'start',
						amount: this.options.transitionDuration / 10
					}
				}),
				gsap.effects.animateChars(this.elementsFirstSlide.headings, {
					duration: this.options.transitionDuration,
					ease: 'expo.out',
					stagger: {
						from: 'start',
						amount: this.options.transitionDuration / 3
					}
				}),
				gsap.effects.animateLines(this.elementsFirstSlide.texts, {
					duration: this.options.transitionDuration,
					stagger: {
						from: 'start',
						amount: this.options.transitionDuration / 10
					}
				}),
				gsap.to(this.elementsFirstSlide.buttons, {
					duration: 0.3,
					y: 0,
					autoAlpha: 1
				}),
				gsap.to(this.elementsFirstSlide.overlays, {
					autoAlpha: 1,
					duration: 0.3
				}),
				gsap.to(this.elements.dots, {
					autoAlpha: 1,
					// y: 0,
					// x: 0,
					duration: 0.3
				}),
				gsap.to(this.elements.arrowsInner, {
					autoAlpha: 1,
					y: 0,
					x: 0,
					duration: 0.3,
					onComplete: () => {
						gsap.set(this.elements.arrowsInner, {
							clearProps: 'all'
						});
					}
				}),
				gsap.to(this.elements.arrows, {
					autoAlpha: 1,
					duration: 0.3,
					onComplete: () => {
						gsap.set(this.elements.arrows, {
							clearProps: 'all'
						});
					}
				}),
				() => {
					if (!!this.options.autoplay) {
						this.fullpageSlider.autoplay.init();
					}

					this._lockInteraction(false);
				}
			], '<66%');

		return tl;
	}

	_getTimelineTransition({
		current = {
			section,
			maskOuter,
			maskInner,
			subheading,
			heading,
			text,
			button,
			overlay,
		} = {},
		target = {
			section,
			maskOuter,
			maskInner,
			subheading,
			heading,
			text,
			button,
			overlay
		} = {},
		direction
	}) {
		const tl = gsap.timeline();

		tl
			.add(() => this._lockInteraction(true))
			.add(this._setSection(target.section, true))
			.add(this._animateSlideOut(0, direction, target))
			.add(this._animateSlideOut(this.options.transitionDuration, direction, current))
			.add(this._animateSlideContentOut(this.options.transitionDuration, direction, current), '<')

		tl
			.add(this._animateSlideIn(this.options.transitionDuration, direction, target), '<20%')
			.add(this._animateSlideContentIn(this.options.transitionDuration, direction, target), '<66%')
			.add(() => this._lockInteraction(false), '<50%')
			.add(this._setSection(current.section, false));

		return tl;
	}

	_getTimelineTransitionWebGL({
		current = {
			section,
			maskOuter,
			maskInner,
			subheading,
			heading,
			text,
			button,
			overlay,
		} = {},
		target = {
			section,
			maskOuter,
			maskInner,
			subheading,
			heading,
			text,
			button,
			overlay
		} = {},
		direction
	}) {
		const tl = gsap.timeline();

		tl
			.add(() => this._lockInteraction(true))
			.add(this._setSection(target.section, true))
			// .add(this._animateSlideOut(0, direction, target))
			.add(this._animateSlideOutWebGL(this.options.transitionDuration, direction, current))
			.add(this._animateSlideContentOut(this.options.transitionDuration, direction, current), '<')

		tl
			.add(this._animateSlideInWebGL(this.options.transitionDuration, direction, target), '<50%')
			.add(this._animateSlideContentIn(this.options.transitionDuration, direction, target), '<66%')
			.add(() => this._lockInteraction(false), '<50%')
			.add(this._setSection(current.section, false));

		return tl;
	}

	_animateSlideOut(duration = this.options.transitionDuration, direction = 'next', {
		maskOuter,
		maskInner
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			});
		let maskDirection = this._getHideMaskDirection(direction);

		if (maskOuter) {
			tl.hideMask(maskOuter, {
				animateTo: maskDirection,
				duration,
				clearProps: '',
				stagger: 0.1
			}, 'start');
		}

		if (maskInner) {
			tl.to(maskInner, {
				scale: 1.1,
				transformOrigin: 'center center',
				stagger: 0.1
			}, 'start');
		}

		return tl;
	}

	_animateSlideOutWebGL(duration = this.options.transitionDuration, direction = 'next', {
		section
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			});

		return tl;
	}

	_animateSlideIn(duration = this.options.transitionDuration, direction = 'next', {
		maskOuter,
		maskInner
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			});

		let maskDirection = this._getAnimateMaskDirection(direction);

		if (maskOuter) {
			tl.animateMask(maskOuter, {
				animateFrom: maskDirection,
				duration,
				clearProps: '',
				stagger: 0.1
			}, 'start');
		}

		if (maskInner) {
			tl.fromTo(maskInner, {
				scale: 1.1
			}, {
				scale: 1,
				transformOrigin: 'center center',
				stagger: 0.1
			}, 'start');
		}

		return tl;
	}

	_animateSlideInWebGL(duration = this.options.transitionDuration, direction = 'next', {
		section
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			});

		return tl;
	}

	_getHideMaskDirection(direction) {
		if (this.options.direction === 'vertical') {
			if (direction === 'next') {
				return 'bottom';
			} else {
				return 'top';
			}
		} else {
			if (direction === 'next') {
				return 'left';
			} else {
				return 'right';
			}
		}
	}

	_getAnimateMaskDirection(direction) {
		if (this.options.direction === 'vertical') {
			if (direction === 'next') {
				return 'top';
			} else {
				return 'bottom';
			}
		} else {
			if (direction === 'next') {
				return 'right';
			} else {
				return 'left';
			}
		}
	}
}

export default class SliderFullpageBackgroundsMask extends SliderFullpageBase {
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

	getRevealAnimation() {
		const
			isNoScaleRequired = this.options.scaleOuter === 1 && this.options.scaleInner === 1,
			duration = 1.2,
			tl = gsap.timeline({
				paused: true,
				onStart: () => {
					this._lockInteraction(true);
				},
				defaults: {
					duration,
					ease: 'power3.inOut'
				}
			});

		tl
			.set(this.elementsFirstSlide.sections, {
				autoAlpha: 1,
			})
			.fromTo(this.elementsFirstSlide.masksOuter, {
				transformOrigin: 'center center',
				scale: 1,
				'--shape-size': 100
			}, {
				scale: this.options.scaleOuter,
				duration: isNoScaleRequired ? 0.01 : duration,
				'--shape-size': this.options.shapeSize
			})
			.fromTo(this.elementsFirstSlide.masksInner, {
				transformOrigin: 'center center',
				scale: 1,
			}, {
				scale: this.options.scaleInner,
				duration: isNoScaleRequired ? 0.01 : duration
			}, '<')
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
					y: 0,
					x: 0,
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
		const tl = gsap.timeline(),
			isNoScaleRequired = this.options.scaleOuter === 1 && this.options.scaleInner === 1,
			allMasks = [current.maskOuter, current.maskInner, target.maskOuter, target.maskInner];

		tl
			.add(() => this._lockInteraction(true))
			.add(this._setSection(target.section, true))
			.add(this._animateSlideContentOut(0, direction === 'next' ? 'prev' : 'next', target))
			.add(this._animateSlideMaskOut(0, direction, target))
			.add(this._animateSlideContentOut(this.options.transitionDuration, direction, current))
			.add(this._animateSlideMaskOut(this.options.transitionDuration, direction, current), '<')

		if (!isNoScaleRequired && allMasks.length) {
			tl.to({}, {
				ease: 'power3.inOut',
				duration: isNoScaleRequired ? 0.01 : this.options.transitionDuration,
			}, '<')
		}

		tl.add(this._animateSlideMaskIn(this.options.transitionDuration, direction, target), isNoScaleRequired ? '<' : '<66%')
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
			.add(this._animateSlideOutWebGL(this.options.transitionDuration, direction, current))
			.add(this._animateSlideContentOut(this.options.transitionDuration, direction, current), '<')

		tl
			.add(this._animateSlideInWebGL(this.options.transitionDuration, direction, target), '<')
			.add(this._animateSlideContentIn(this.options.transitionDuration, direction, target), '<66%')
			.add(() => this._lockInteraction(false), '<50%')
			.add(this._setSection(current.section, false));

		return tl;
	}

	_animateSlideMaskOut(duration = this.options.transitionDuration, direction = 'next', {
		maskOuter,
		maskInner
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'power3.inOut',
					duration
				}
			}),
			isNoScaleRequired = this.options.scaleOuter === 1 && this.options.scaleInner === 1,
			isNextDirection = direction === 'next',
			isVerticalDirection = this.options.direction === 'vertical',
			axis = isVerticalDirection ? 'y' : 'x';

		if (maskOuter) {
			tl.to(maskOuter, {
				scale: 1.0,
				force3D: false,
				duration: isNoScaleRequired ? 0.01 : duration
			}, 'start');
		}

		if (maskInner) {
			tl.to(maskInner, {
				scale: 1.0,
				force3D: false,
				duration: isNoScaleRequired ? 0.01 : duration
			}, 'start');
		}

		if (!isNoScaleRequired && maskOuter) {
			tl.fromTo(maskOuter, {
				'--shape-size': this.options.shapeSize
			}, {
				'--shape-size': this.options.shapeSizeTransition,
			}, '<');
		}

		// Animate out current section mask element #1
		if (maskOuter) {
			tl.to(maskOuter, {
				[axis]: isNextDirection ? '-100%' : '100%',
			}, '<66%');
		}

		// Animate out current section mask element #2
		if (maskInner) {
			tl.to(maskInner, {
				[axis]: isNextDirection ? '50%' : '-50%',
			}, '<');
		}

		return tl;
	}

	_animateSlideOutWebGL(duration = this.options.transitionDuration, direction = 'next', {
		section
	}) {
		if (!this.curtains || !this.curtains.instance) {
			return;
		}

		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			}),
			ID = section.getAttribute('data-post-id');

		this.curtains.instance.planes
			.filter(plane => plane.userData && plane.userData.postId === ID)
			.forEach(plane => {
				const animation = {
					opacity: plane.uniforms.opacity.value,
					transition: 0,
					scaleX: plane.scale.x,
					scaleY: plane.scale.y,
					transformOriginX: plane.transformOrigin.x,
					transformOriginY: plane.transformOrigin.y,
					transformOriginZ: plane.transformOrigin.z
				};

				tl
					.to(animation, {
						opacity: 0,
						transition: 1,
						scaleX: 1.5,
						scaleY: 1.5,
						transformOriginX: 0.5,
						transformOriginY: 0.5,
						transformOriginZ: 0.5,
						duration: 2.4,
						ease: 'expo.inOut',
						onComplete: () => {
							// Turn off plane visibility
							plane.visible = false;
							plane.setRenderOrder(0);
						},
						onUpdate: () => {
							plane.uniforms.opacity.value = animation.opacity;

							plane.scale.x = animation.scaleX;
							plane.scale.y = animation.scaleY;

							plane.transformOrigin.x = animation.transformOriginX;
							plane.transformOrigin.y = animation.transformOriginY;
							plane.transformOrigin.z = animation.transformOriginZ;

							if (animation.progress < 0.5) {
								plane.uniforms.transition.value = animation.transition;
							} else {
								plane.uniforms.transition.value = 1 - animation.transition;
							}
						}
					});
			});

		return tl;
	}

	_animateSlideMaskIn(duration = this.options.transitionDuration, direction = 'next', {
		maskOuter,
		maskInner
	}) {
		const
			tl = gsap.timeline({
				defaults: {
					ease: 'power3.inOut',
					duration
				}
			}),
			isNoScaleRequired = this.options.scaleOuter === 1 && this.options.scaleInner === 1,
			isNextDirection = direction === 'next',
			isVerticalDirection = this.options.direction === 'vertical',
			axis = isVerticalDirection ? 'y' : 'x';

		// Animate in next section mask element #1
		if (maskOuter) {
			tl.fromTo(maskOuter, {
				// scale: 1.0,
				[axis]: isNextDirection ? '100%' : '-100%',
				// immediateRender: true
			}, {
				[axis]: '0%',
				force3D: false,
			}, '<');
		}

		// Animate in next section mask element #2
		if (maskInner) {
			tl.fromTo(maskInner, {
				// scale: 1.0,
				[axis]: isNextDirection ? '-50%' : '50%',
				// immediateRender: true
			}, {
				[axis]: '0%',
				force3D: false,
			}, '<');
		}

		if (!isNoScaleRequired) {
			// Animate in next section shape #1
			if (maskOuter) {
				tl.fromTo(maskOuter, {
					// scale: 1,
					'--shape-size': this.options.shapeSizeTransition,
				}, {
					scale: this.options.scaleOuter,
					'--shape-size': this.options.shapeSize,
				}, '<66%');
			}

			// Animate in next section shape #2
			if (maskInner) {
				tl.to(maskInner, {
					scale: this.options.scaleInner,
				}, '<');
			}
		}

		return tl;
	}

	_animateSlideInWebGL(duration = this.options.transitionDuration, direction = 'next', {
		section
	}) {
		if (!this.curtains || !this.curtains.instance) {
			return;
		}

		const
			tl = gsap.timeline({
				defaults: {
					ease: 'expo.inOut',
					duration
				}
			}),
			ID = section.getAttribute('data-post-id');

		this.curtains.instance.planes
			.filter(plane => plane.userData && plane.userData.postId === ID)
			.forEach(plane => {
				const animation = {
					opacity: 0,
					transition: 0,
					scaleX: 1.5,
					scaleY: 1.5,
					transformOriginX: plane.transformOrigin.x,
					transformOriginY: plane.transformOrigin.y,
					transformOriginZ: plane.transformOrigin.z
				};

				tl
					.to(animation, {
						opacity: 1,
						transition: 1,
						scaleX: 1,
						scaleY: 1,
						transformOriginX: 0.5,
						transformOriginY: 0.5,
						transformOriginZ: 0.5,
						duration: 2.4,
						ease: 'expo.inOut',
						onStart: () => {
							// Put the current plane in front
							plane.setRenderOrder(1);

							plane.uniforms.opacity.value = 0;

							// Turn on plane visibility
							plane.visible = true;
						},
						onUpdate: () => {
							plane.uniforms.opacity.value = animation.opacity;

							plane.scale.x = animation.scaleX;
							plane.scale.y = animation.scaleY;

							plane.transformOrigin.x = animation.transformOriginX;
							plane.transformOrigin.y = animation.transformOriginY;
							plane.transformOrigin.z = animation.transformOriginZ;

							if (animation.progress < 0.5) {
								plane.uniforms.transition.value = animation.transition;
							} else {
								plane.uniforms.transition.value = 1 - animation.transition;
							}
						}
					});
			});

		return tl;
	}
}

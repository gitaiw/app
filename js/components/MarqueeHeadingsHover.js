export default class MarqueeHeadingsHover extends BaseComponent {
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
				webGL: {
					enabled: false,
					vertices: 16
				},
				preventScroll: false,
				drag: {
					label: false,
					arrowsDistance: 45,
					scale: 1.2,
					hideNative: false,
					toggleClass: 'marquee-headings-hover_mouse-drag'
				},
				delimiter: '&nbsp;&nbsp;/&nbsp;&nbsp;',
				direction: 'horizontal',
				matchMedia: false,
				onScrollRotatingButtonSpeed: 2,
				loop: true,
				autoCenterFirstItem: true,
				marquee: {
					speed: 0.6
				},
				scroll: app.options.virtualScroll,
				type: 'wheel,touch,pointer',
				toggleScrollingClass: 'marquee-headings-hover_scrolling',
				toggleDraggingClass: 'marquee-headings-hover_dragging',
				togglePressedClass: 'marquee-headings-hover_pressed',
				snapOnRelease: {
					keyboard: true,
					toggleActiveItemClass: 'active',
					removeActiveClassOnInteraction: false
				},
				wheelSpeed: -1,
				speedEffect: false,
				opacityEffect: false,
				currentClass: 'current',
				itemIdAttribute: 'data-post-id'
			},
			// Component inner elements
			innerElements: {
				canvasWrapper: '.canvas-wrapper',
				fixedCanvasWrapper: '.canvas-wrapper_sticky',
				lanes: '.js-marquee-headings-hover__lane',
				items: '.js-marquee-headings-hover__item',
				labels: '.js-marquee-headings-hover__label',
				wrappers: '.js-marquee-headings-hover__wrapper',
				fixedWrapper: '.js-marquee-headings-hover__fixed-wrapper',
				links: '.js-marquee-headings-hover__link',
				images: '.marquee-headings-hover__wrapper-img',
				animationFade: '.js-marquee-headings-hover__animation-fade',
				animationReveal: '.js-marquee-headings-hover__animation-reveal'
			},
		});

		this._handlers = {
			hoverIn: this._onMouseEnter.bind(this),
			hoverOut: this._onMouseLeave.bind(this),
			updateView: this._onUpdateView.bind(this),
			updateVisible: this._onUpdateVisible.bind(this),
			resize: app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime())
		};

		this.tl = gsap.timeline();

		this.clamp = gsap.utils.clamp(1, 10);
		this.setup();
	}

	init() {
		this.rotatingButtons = this.components.filter((component, index) => component.name === 'RotatingButton');
		this.updateRef('cursorRef', 'CursorFollower');

		this._addDelimiter();
		this._setImages();
		this._createInfiniteListHeadings();

		if (!!this.options.webGL && !!this.options.webGL.enabled) {
			this.setLoading(true);

			app.componentsManager.load({
				properties: app.components['CurtainsBase'],
			}).then((module) => {
				if (this.infiniteListHeadings.enabled) {
					this.infiniteListHeadings.pluginsReady.then(() => {
						this._initCurtains(module);
						this._attachEvents();
						this.setLoading(false);
					});
				} else {
					this._initCurtains(module);
					this._attachEvents();
					this.setLoading(false);
				}
			})
		} else {
			this._attachEvents();
		}

		this._pinElements();
	}

	destroy() {
		this._detachEvents();

		if (this.infiniteListHeadings) {
			this.infiniteListHeadings.destroy();
		}

		if (this.curtains) {
			document.addEventListener('arts/barba/transition/end', this.curtains.destroy.bind(this.curtains), {
				once: true
			});
		}
	}

	prepareAnimation() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => {
					resolve(true);
				}
			});

			if (this.elements.animationReveal.length) {
				tl.set(this.elements.animationReveal, {
					y: '100%'
				});
			}

			if (this.elements.animationFade.length) {
				tl.set(this.elements.animationFade, {
					autoAlpha: 0
				});
			}
		});
	}

	getRevealAnimation() {
		const tl = gsap.timeline({
			paused: true
		});

		if (this.elements.animationReveal.length) {
			tl.to(this.elements.animationReveal, {
				y: '0%',
				duration: 1.2,
				ease: 'power3.out',
				stagger: distributeByPosition({
					from: 'start',
					axis: 'y',
					amount: 0.6
				}),
			}, 'start');
		}

		if (this.elements.animationFade.length) {
			tl.to(this.elements.animationFade, {
				autoAlpha: 1,
				duration: 1.2,
				stagger: 0.05,
				clearProps: 'opacity,visibility',
				ease: 'power3.out'
			}, 'start');
		}

		return tl;
	}

	_setImages() {
		this.elements.images.forEach((el) => {
			const element = el.querySelectorAll('img, video');

			gsap.set(element, {
				scale: 1.05
			});
		});
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

	_createInfiniteListHeadings() {
		this.infiniteListHeadings = new ArtsInfiniteList(this.element, {
			direction: this.options.direction,
			mapWheelEventYtoX: true,
			listElementsSelector: this.innerSelectors.items,
			autoCenterFirstItem: this.options.autoCenterFirstItem,
			multiLane: {
				laneSelector: this.innerSelectors.lanes,
				laneOptionsAttribute: 'data-arts-infinite-list-options'
			},
			matchMedia: this.options.matchMedia,
			loop: this.options.loop,
			autoClone: this.options.loop,
			scroll: this.options.scroll,
			plugins: {
				marquee: typeof this.options.marquee === 'object' ? {
					autoInit: true,
					...this.options.marquee
				} : false,
				scroll: this.options.scroll ? {
					type: this.options.type,
					toggleScrollingClass: this.options.toggleScrollingClass,
					toggleDraggingClass: this.options.toggleDraggingClass,
					togglePressedClass: this.options.togglePressedClass,
					snapOnRelease: this.options.snapOnRelease,
					preventDefault: this.options.preventScroll
				} : false,
				speedEffect: this.options.speedEffect,
				opacityEffect: this.options.opacityEffect
			},
		});
	}

	_onMouseEnter(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._toggleMarqueeAnimation(false);
			this._highlightActiveElements(target, true);
			this._animateImage(target);
		}
	}

	_onMouseLeave(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._toggleMarqueeAnimation(true);
			this._highlightActiveElements(target, false);
			this._hideImages();
		}
	}

	_onResize() {
		if (!!this.curtains) {
			this.curtains.instance.planes.forEach((plane, index) => {
				plane.scale.x = 1;
				plane.scale.y = 1;

				if (plane.textures.length) {
					plane.textures.forEach((texture) => {
						texture.scale.x = 1;
						texture.scale.y = 1;
					});
				}
			});

			this.curtains.instance.resize();
		}
	}

	_attachEvents() {
		app.hoverEffect.attachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);

		if (!!this.options.onScrollRotatingButtonSpeed && this.rotatingButtons.length) {
			this.infiniteListHeadings.controller.on('scrollUpdate', (velocity, direction) => {
				let multiplier = this.clamp(velocity * 100) * this.options.onScrollRotatingButtonSpeed;

				this.rotatingButtons.forEach((button) => {
					if (button.stScrub) {
						button.stScrub.animation.timeScale(multiplier);
					}
				});
			});
		}

		if (!!this.options.webGL) {
			app.utilities.attachResponsiveResize({
				callback: this._handlers.resize,
			});
		}

		if (!!this.options.drag) {
			if (typeof this.options.drag.toggleClass === 'string') {
				this.element.classList.add(this.options.drag.toggleClass);
			}

			this._attachDragListeners();
		}

		document.addEventListener('arts/barba/transition/start', this._detachEvents.bind(this), {
			once: true
		});

		document.addEventListener('arts/barba/transition/start', this._unpinElements.bind(this), {
			once: true
		});
	}

	_detachEvents() {
		app.hoverEffect.detachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);
	}

	_attachDragListeners() {
		this.infiniteListHeadings.controller.on('dragPressed', (pressed) => {
			this.updateRef('cursorRef', 'CursorFollower');

			if (this.cursorRef) {
				if (pressed) {
					this.cursorRef.instance.set({
						autoReset: false,
						arrows: this.options.direction,
						arrowsDistance: this.options.drag.arrowsDistance,
						scale: this.options.drag.scale,
						label: this.options.drag.label || '',
						hideNative: this.options.drag.hideNative
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

	_toggleMarqueeAnimation(enabled = true) {
		if (!this.infiniteListHeadings.enabled) {
			return;
		}

		if (!!this.options.marquee && 'marquee' in this.infiniteListHeadings.plugins) {
			if (enabled) {
				this.infiniteListHeadings.plugins.marquee.enable();
			} else {
				this.infiniteListHeadings.plugins.marquee.disable();
			}
		}
	}

	_highlightActiveElements(link, enabled = true) {
		const
			ID = parseInt(link.getAttribute(`${this.options.itemIdAttribute}`)),
			elements = [...this.element.querySelectorAll(`[${this.options.itemIdAttribute}="${ID}"]`)];

		if (elements.length) {
			elements.forEach((el) => {
				el.classList.toggle(`${this.options.currentClass}`, enabled);
			});
		}
	}

	_animateImage(link) {
		const ID = link.getAttribute(`${this.options.itemIdAttribute}`);

		this.tl.clear();

		if (this.curtains && this.curtains.instance) {
			this.curtains.instance.planes.forEach(plane => {
				if (plane.userData && plane.userData.postId === ID) {
					const animation = {
						opacity: plane.uniforms.opacity.value
					};

					// Put the current plane in front
					plane.setRenderOrder(1);

					this.tl
						.to(animation, {
							opacity: 1,
							duration: 0.6,
							ease: 'power3.inOut',
							onStart: () => {
								plane.visible = true;
							},
							onUpdate: () => {
								plane.uniforms.opacity.value = animation.opacity;
							}
						}, 'start');
				} else {
					const animation = {
						opacity: plane.uniforms.opacity.value
					};

					plane.setRenderOrder(0);

					this.tl
						.to(animation, {
							opacity: 0,
							duration: 0.6,
							ease: 'power3.inOut',
							onComplete: () => {
								plane.visible = false;
							},
							onUpdate: () => {
								plane.uniforms.opacity.value = animation.opacity;
							}
						}, 'start');
				}
			});
		} else {
			this.elements.images.forEach((el) => {
				const img = el.querySelectorAll('img, video');

				if (el.getAttribute(`${this.options.itemIdAttribute}`) === ID) {
					this.tl
						.set(el, {
							zIndex: 50
						}, 'start')
						.to(img, {
							scale: 1,
							transformOrigin: 'center bottom',
							duration: 0.6,
							ease: 'power3.inOut'
						}, 'start')
						.to(el, {
							'--shape-size': 100,
							duration: 0.6,
							ease: 'power3.inOut'
						}, 'start');
				} else {
					this.tl
						.set(el, {
							clearProps: 'zIndex'
						}, 'start')
						.to(img, {
							scale: 1.05,
							transformOrigin: 'center bottom',
							duration: 0.6,
							ease: 'power3.inOut'
						}, 'start')
						.to(el, {
							'--shape-size': 0,
							duration: 0.6,
							ease: 'power3.inOut',
							clearProps: 'zIndex'
						}, 'start');
				}
			});

		}
	}

	_hideImages() {
		this.tl.clear();

		if (this.curtains && this.curtains.instance) {
			this.curtains.instance.planes.forEach(plane => {
				const animation = {
					opacity: plane.uniforms.opacity.value
				};

				this.tl
					.to(animation, {
						opacity: 0,
						duration: 0.6,
						ease: 'power3.inOut',
						onComplete: () => {
							plane.visible = false;
						},
						onUpdate: () => {
							plane.uniforms.opacity.value = animation.opacity;
						}
					}, 'start');
			});
		} else {

			this.elements.images.forEach((el) => {
				const img = el.querySelectorAll('img, video');

				this.tl
					.set(el, {
						clearProps: 'zIndex'
					})
					.to(img, {
						scale: 1.05,
						transformOrigin: 'center bottom',
						duration: 0.6,
						ease: 'power3.inOut'
					}, 'start')
					.to(el, {
						'--shape-size': 0,
						duration: 0.6,
						ease: 'power3.inOut'
					}, 'start');
			});

		}
	}

	_pinElements() {
		if (this.elements.fixedCanvasWrapper) {
			this.triggerStickyCanvas = ScrollTrigger.create({
				trigger: this.element,
				pin: this.elements.fixedCanvasWrapper,
				pinSpacing: false,
				start: `top top`,
				end: `bottom bottom`,
				// onToggle: () => {
				// 	// this.curtains.instance.updateScrollValues(0, window.scrollY);
				// 	this.curtains.instance.resize();
				// }
			});
		}

		if (this.elements.fixedWrapper) {
			this.triggerStickyWrapper = ScrollTrigger.create({
				trigger: this.element,
				pin: this.elements.fixedWrapper,
				start: `top top`,
				end: `bottom bottom`
			});
		}
	}

	_unpinElements() {
		if (this.triggerStickyCanvas) {
			this.triggerStickyCanvas.kill(false);
			this.triggerStickyCanvas = null;
		}

		if (this.triggerStickyWrapper) {
			this.triggerStickyWrapper.kill(false);
			this.triggerStickyWrapper = null;
		}
	}

	// WebGL methods
	_initCurtains(module) {
		const AJAXRef = app.componentsManager.getComponentByName('AJAX');
		let options = {
			planes: {
				widthSegments: 16,
				heightSegments: 16,
				uniforms: {
					opacity: {
						name: 'uOpacity',
						type: '1f',
						value: 0
					}
				},
				vertexShader: this._vShaderPlane(),
				fragmentShader: this._fShaderPlane()
			},
			itemIdAttribute: this.options.itemIdAttribute,
			onContextLost: this._handlers.resize
		};

		if (typeof this.options.webGL === 'object') {
			options = deepmerge(this.options.webGL, options);

			if (typeof this.options.webGL.vertices === 'number') {
				options.planes.widthSegments = this.options.webGL.vertices;
				options.planes.heightSegments = this.options.webGL.vertices;
			}
		}

		this.curtains = new module.default({
			element: this.element,
			container: this.elements.canvasWrapper[0],
			lanes: [this.element],
			options,
		});

		this._setWebGLReady();

		if (AJAXRef && AJAXRef.running) {
			document.addEventListener('arts/barba/transition/end/before', () => {
				if (this.curtains && this.curtains.instance) {
					this.curtains.instance.resize();
				}
			}, {
				once: true
			})
		}
	}

	_attachPlanesUpdateListeners() {
		this.infiniteListHeadings.controller.on('visibleUpdate', this._handlers.updateVisible);
		this.infiniteListHeadings.view.on('update', this._handlers.updateView);
	}

	_detachPlanesUpdateListeners() {
		this.infiniteListHeadings.controller.off('visibleUpdate', this._handlers.updateVisible);
		this.infiniteListHeadings.view.off('update', this._handlers.updateView);
	}

	_onUpdateView({ updatedItemState, indexLane, indexItem }) {
		if (!this.curtains.planes[indexLane] || !this.curtains.planes[indexLane][indexItem]) {
			return;
		}

		const plane = this.curtains.planes[indexLane][indexItem];

		if (typeof plane.uniforms !== 'object') {
			return;
		}

		if (this.options.direction === 'horizontal') {
			plane.uniforms.velocityX.value = this.infiniteListHeadings.controller.lanes[indexLane].scroller.velocity;
			plane.uniforms.velocityY.value = 0;
		} else {
			plane.uniforms.velocityX.value = 0;
			plane.uniforms.velocityY.value = this.infiniteListHeadings.controller.lanes[indexLane].scroller.velocity;
		}

		if ('visible' in updatedItemState) {
			plane.visible = updatedItemState.visible;
		}

		if ('opacity' in updatedItemState && typeof updatedItemState.opacity === 'number') {
			plane.uniforms.opacity.value = updatedItemState.opacity;
		}

		if ('transform' in updatedItemState) {
			const transform = updatedItemState.transform;

			if ('scale' in transform) {
				plane.scale.x = transform.scale;
				plane.scale.y = transform.scale;
			}

			if ('origin' in transform) {
				if (transform.origin === 'left center') {
					plane.transformOrigin.x = 0;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				} else if (transform.origin === 'right center') {
					plane.transformOrigin.x = 1;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				} else {
					plane.transformOrigin.x = 0.5;
					plane.transformOrigin.y = 0.5;
					plane.transformOrigin.z = 0;
				}
			}

			if ('translate' in transform) {
				if (typeof transform.translate === 'object') {
					plane.relativeTranslation.x = transform.translate.x;
					plane.relativeTranslation.y = transform.translate.y;
					plane.relativeTranslation.z = transform.translate.z;
				}

				if (typeof transform.translate === 'number') {
					plane.relativeTranslation.x = transform.translate;
				}
			}

			if ('rotate' in transform) {
				if (typeof transform.rotate === 'object') {
					plane.rotation.x = -app.utilities.degrees2Radians(transform.rotate.x);
					plane.rotation.y = -app.utilities.degrees2Radians(transform.rotate.y);
					plane.rotation.z = -app.utilities.degrees2Radians(transform.rotate.z);
				}

				if (typeof transform.rotate === 'number') {
					plane.rotation.z = -app.utilities.degrees2Radians(transform.rotate);
				}
			}
		}
	}

	_onUpdateVisible(visible) {
		if (this.curtains && this.curtains.instance) {
			if (visible) {
				this.curtains.instance.enableDrawing();
			} else {
				this.curtains.instance.disableDrawing();
			}
		}
	}

	_vShaderPlane() {
		return `
			#define PI 3.1415926535897932384626433832795

			precision mediump float;

			// Default mandatory variables
			attribute vec3 aVertexPosition;
			attribute vec2 aTextureCoord;

			uniform mat4 uMVMatrix;
			uniform mat4 uPMatrix;

			uniform mat4 uTextureMatrix0;
			uniform vec2 uPlaneSizes;

			// Custom variables
			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			// Custom uniforms
			uniform vec2 uMousePosition;
			uniform vec2 uViewportSizes;
			uniform float uVelocityX;
			uniform float uVelocityY;
			uniform float uOpacity;
			uniform float uTime;
			uniform float uHoverAmplitude;
			uniform float uHoverSpeed;
			uniform float uHoverSegments;
			uniform float uHovered;
			uniform float uTransition;
			uniform float uElasticEffect;

			void main() {
				vec3 vertexPosition = aVertexPosition;

				// 1. Speed Effect
				// vertexPosition.y -= sin(vertexPosition.x * 2. / (uViewportSizes.y) * PI + PI / 2.0) * uVelocityY * (uPlaneSizes.y / 2.) * uElasticEffect;
				// vertexPosition.x += sin(vertexPosition.y * 2. / (uViewportSizes.x) * PI + PI / 2.0) * uVelocityX * (uPlaneSizes.x / 2.) * uElasticEffect;

				// 2. Hover Effect
				vertexPosition.z += sin(vertexPosition.x * (uHoverSegments) + (uTime * 0.03) + uHoverSpeed) * uHoverAmplitude * 0.005;
				vertexPosition.x += sin(vertexPosition.y * (uHoverSegments) + (uTime * 0.03) + uHoverSpeed) * uHoverAmplitude * 0.005;

				// 3. Transition
				// convert uTransition from [0,1] to [0,1,0]
				float transition = 1.0 - abs((uTransition * 2.0) - 1.0);

				// Get the distance between our vertex and the mouse position
				float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));

				// Calculate our wave effect
				float waveSinusoid = cos(6. * (distanceFromMouse - (uTime * 0.02)));

				// Attenuate the effect based on mouse distance
				float distanceStrength = (0.4 / (distanceFromMouse + 0.4));

				// Calculate our distortion effect
				float distortionEffect = distanceStrength * waveSinusoid * 0.33;

				// Apply it to our vertex position
				vertexPosition.z +=  distortionEffect * -transition;
				vertexPosition.x +=  distortionEffect * transition * (uMousePosition.x - vertexPosition.x);
				vertexPosition.y +=  distortionEffect * transition * (uMousePosition.y - vertexPosition.y);

				gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

				// Varyings
				vVertexPosition = vertexPosition;
				vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;
			}
		`;
	}

	_fShaderPlane() {
		return `
			precision mediump float;

			varying vec3 vVertexPosition;
			varying vec2 vTextureCoord;

			uniform float uOpacity;
			uniform float uTransition;
			uniform sampler2D uSampler0;

			void main() {
				// Apply texture
				vec4 finalColor = texture2D(uSampler0, vTextureCoord);

				// Apply opacity
				finalColor.a = uOpacity;

				// Fake shadows based on vertex position along Z axis
				finalColor.rgb += clamp(vVertexPosition.z, -1.0, 0.0) * 0.75 * uTransition;

				// Fake lights based on vertex position along Z axis
				finalColor.rgb += clamp(vVertexPosition.z, 0.0, 1.0) * 0.75 * uTransition;

				// Display texture
				gl_FragColor = finalColor;
			}
		`;
	}
}

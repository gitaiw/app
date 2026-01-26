export default class AutoScrollNext extends BaseComponent {
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
			// External options from app.options.autoScrollNext
			defaults: app.options.autoScrollNext,
			// Component inner elements
			innerElements: {
				canvasWrapper: '.js-auto-scroll-next__canvas-wrapper',
				fixedWrapper: '.js-auto-scroll-next__fixed-wrapper',
				scrollDownWrapper: '.js-auto-scroll-next__scroll-down-wrapper',
				nextHeader: '.js-auto-scroll-next__next-header',
				nextLinks: '.js-auto-scroll-next__next-header a',
				progressLine: '.js-auto-scroll-next__progress-line',
				mediaWrapper: '.js-auto-scroll-next__wrapper-media',
				media: '.js-auto-scroll-next__media'
			}
		});
		this._handlers = {
			clickHeader: this._onClickHeader.bind(this),
			toggleScene: this._onToggleScene.bind(this),
			progressScene: this._onProgressScene.bind(this),
			transitionStart: this._onTransitionStart.bind(this),
			transitionEnd: this._onTransitionEnd.bind(this),
			visibleUpdate: this._onVisibleUpdate.bind(this),
			resize: app.utilities.debounce(this._onResize.bind(this), app.utilities.getDebounceTime()),
			update: this._updateCurtains.bind(this)
		};
		this.transitionActive = false;

		this.setup();
	}

	setup() {
		const AJAX = app.componentsManager.getComponentByName('AJAX');

		document.fonts.ready.then(() => this.mount()).then(() => {
			if (AJAX && AJAX.running) {
				document.addEventListener('arts/barba/transition/end', () => {
					this.init();
					this._initAnimations();
				}, {
					once: true
				});
			} else {
				this.init();
				this._initAnimations();
			}

			// Set component ready on the next tick
			gsap.ticker.add(this._setReady.bind(this), true, false);
		});
	}

	init() {
		this.updateRef('headerRef', 'Header');
		this.maskRef = this.components.filter(component => component.name === 'Mask');

		this._createFixedScene();

		if (!!app.options.ajax) {
			this._createPrefetchScene();
		}

		if (!!this.options.webGL && !!this.options.webGL.enabled) {
			this.setLoading(true);

			app.componentsManager.load({
				properties: app.components['CurtainsBase'],
			}).then((module) => {
				this._initCurtains(module);
				this._attachEvents();
				this.setLoading(false);
			});
		} else {
			this._attachEvents();
		}
	}

	destroy() {
		this._detachEvents();

		if (this.curtains) {
			document.addEventListener('arts/barba/transition/end', this._handlers.transitionEnd, {
				once: true
			});
		}
	}

	_attachEvents() {
		if (this.elements.nextHeader[0]) {
			this.elements.nextHeader[0].addEventListener('click', this._handlers.clickHeader, true);
		}

		if (this.elements.mediaWrapper[0]) {
			this.elements.mediaWrapper[0].addEventListener('click', this._handlers.clickHeader, true);
		}

		if (this.elements.scrollDownWrapper[0]) {
			this.elements.scrollDownWrapper[0].addEventListener('click', this._handlers.clickHeader, true);
		}

		this.intersectionInstance = new IntersectionObserver(this._handlers.visibleUpdate);
		this.intersectionInstance.observe(this.element);
	}

	_detachEvents() {
		if (this.elements.nextHeader[0]) {
			this.elements.nextHeader[0].removeEventListener('click', this._handlers.clickHeader, true);
		}

		if (this.elements.mediaWrapper[0]) {
			this.elements.mediaWrapper[0].removeEventListener('click', this._handlers.clickHeader, true);
		}

		if (this.elements.scrollDownWrapper[0]) {
			this.elements.scrollDownWrapper[0].removeEventListener('click', this._handlers.clickHeader, true);
		}

		if (this.intersectionInstance) {
			this.intersectionInstance.disconnect();
		}
	}

	_createFixedScene() {
		this.fixedScene = ScrollTrigger.create({
			start: () => `top top`,
			end: () => `bottom+=100% bottom`,
			pin: this.elements.fixedWrapper[0],
			pinSpacing: true,
			animation: this._getProgressScene(),
			trigger: this.element,
			invalidateOnRefresh: true,
			scrub: true,
			onUpdate: this._handlers.progressScene,
			onRefresh: this._handlers.resize,
			onEnter: this._handlers.toggleScene,
			onLeaveBack: this._handlers.toggleScene,
			onLeave: this._handlers.transitionStart
		});
	}

	_createPrefetchScene() {
		this.prefetchScene = ScrollTrigger.create({
			trigger: this.element,
			start: () => `top-=100% bottom`,
			onEnter: () => {
				if (typeof barba !== 'undefined' && this.elements.nextLinks.length) {
					const url = this.elements.nextLinks[0].getAttribute('href');

					if (url) {
						barba.prefetch(url);
					}

					if (this.prefetchScene) {
						this.prefetchScene.kill();
					}
				}
			}
		});
	}

	_onToggleScene() {
		this._toggleScrollingClass(this.fixedScene.isActive);
		this._updateMask();
		this._updateCurtains();
	}

	_updateCurtains() {
		if (!!this.curtains) {
			this.curtains.instance.resize();
		}
	}

	_updateMask() {
		if (this.maskRef && this.maskRef[0]) {
			this.maskRef[0].update();
		}
	}

	_getProgressScene() {
		const tl = gsap.timeline({
			paused: true
		});

		if (this.elements.progressLine) {
			tl.fromTo(this.elements.progressLine, {
				scaleX: 0,
				transformOrigin: 'left center'
			}, {
				scaleX: 1,
				ease: 'none'
			}, 'start');
		}

		if (this.elements.scrollDownWrapper[0]) {
			tl.fromTo(this.elements.scrollDownWrapper[0], {
				y: '0%',
				autoAlpha: 1
			}, {
				y: '-20%',
				autoAlpha: 0,
				ease: 'none'
			}, 'start');
		}

		if (this.elements.mediaWrapper[0]) {
			let scalePlaneFrom, scalePlaneTo;

			if (typeof this.options.onSceneProgress.scalePlane === 'number' && typeof this.options.onSceneIdle.scalePlane === 'number') {
				scalePlaneFrom = this.options.onSceneIdle.scalePlane;
				scalePlaneTo = this.options.onSceneProgress.scalePlane;
			}

			if (scalePlaneFrom && scalePlaneTo) {
				tl.fromTo(this.elements.mediaWrapper[0], {
					scale: scalePlaneFrom,
					transformOrigin: 'center center',
				}, {
					scale: scalePlaneTo,
					ease: 'none'
				}, 'start');
			}
		}

		if (this.elements.media[0]) {
			let scaleTextureFrom, scaleTextureTo;

			if (typeof this.options.onSceneProgress.scaleTexture === 'number' && typeof this.options.onSceneIdle.scaleTexture === 'number') {
				scaleTextureFrom = this.options.onSceneIdle.scaleTexture;
				scaleTextureTo = this.options.onSceneProgress.scaleTexture;
			}

			if (scaleTextureFrom && scaleTextureTo) {
				tl.fromTo(this.elements.media[0], {
					scale: scaleTextureFrom,
					transformOrigin: 'center center'
				}, {
					scale: scaleTextureTo,
					ease: 'none',
				}, 'start');
			}
		}

		return tl;
	}

	getScrubAnimation() {
		if (!!this.options.toggleHeaderVisibility && this.headerRef) {
			const config = {
				trigger: this.element,
				start: () => `top-=${this.headerRef.element.offsetHeight} top`,
				end: () => `bottom+=100% bottom`,
				scrub: true,
				matchMedia: this.options.matchMedia,
				onToggle: (self) => this.headerRef.toggleHidden(self.isActive)
			};

			return config;
		}
	}

	_toggleScrollingClass(add = true) {
		if (typeof this.options.scrollingClass === 'string') {
			this.element.classList.toggle(this.options.scrollingClass, add);
		}
	}

	_toggleCompleteClass(add = true) {
		if (typeof this.options.completeClass === 'string') {
			this.element.classList.toggle(this.options.completeClass, add);
		}
	}

	_onTransitionStart() {
		this.transitionActive = true;

		this._toggleCompleteClass(true);

		this.fixedScene.kill(false, false);

		if (this.elements.nextLinks.length) {
			this.elements.nextLinks[0].click();
		}
	}

	_onTransitionEnd() {
		if (this.curtains && this.curtains.instance) {
			this.curtains.destroy();
			this.curtains = null;
		}
	}

	_onProgressScene({ progress }) {
		if (this.curtains && this.curtains.instance) {
			const plane = this.curtains.instance.planes[0];

			if (typeof this.options.onSceneProgress.amplitude === 'number' && typeof this.options.onSceneIdle.amplitude === 'number') {
				const diff = this.options.onSceneProgress.amplitude - this.options.onSceneIdle.amplitude;
				const value = this.options.onSceneIdle.amplitude + progress * diff;

				plane.uniforms.hoverAmplitude.value = value;
			}

			if (typeof this.options.onSceneProgress.speed === 'number' && typeof this.options.onSceneIdle.speed === 'number') {
				const diff = this.options.onSceneProgress.speed - this.options.onSceneIdle.speed;
				const value = this.options.onSceneIdle.speed + progress * diff;

				plane.uniforms.hoverSpeed.value = value;
			}

			if (typeof this.options.onSceneProgress.segments === 'number' && typeof this.options.onSceneIdle.segments === 'number') {
				const diff = this.options.onSceneProgress.segments - this.options.onSceneIdle.segments;
				const value = this.options.onSceneIdle.segments + progress * diff;

				plane.uniforms.hoverSegments.value = value;
			}

			if (typeof this.options.onSceneProgress.scalePlane === 'number' && typeof this.options.onSceneIdle.scalePlane === 'number') {
				const diff = this.options.onSceneProgress.scalePlane - this.options.onSceneIdle.scalePlane;
				const value = this.options.onSceneIdle.scalePlane + progress * diff;

				plane.scale.x = value;
				plane.scale.y = value;
			}

			if (typeof this.options.onSceneProgress.scaleTexture === 'number' && typeof this.options.onSceneIdle.scaleTexture === 'number') {
				const diff = this.options.onSceneProgress.scaleTexture - this.options.onSceneIdle.scaleTexture;
				const value = this.options.onSceneIdle.scaleTexture + progress * diff;

				if (plane.textures.length) {
					plane.textures.forEach((texture) => {
						texture.scale.x = value;
						texture.scale.y = value;
					});
				}
			}
		}

		if (typeof this.options.onSceneProgress.scalePlane === 'number' && typeof this.options.onSceneIdle.scalePlane === 'number') {
			const diff = this.options.onSceneProgress.scalePlane - this.options.onSceneIdle.scalePlane;
			const value = this.options.onSceneIdle.scalePlane + progress * diff;

			if (this.maskRef && this.maskRef[0] && this.elements.mediaWrapper[0]) {
				this.maskRef[0].scaleX = value;
				this.maskRef[0].scaleY = value;
				this.maskRef[0].setMask();
			}
		}
	}

	_onClickHeader() {
		if (!this.transitionActive) {
			this.transitionActive = true;

			app.utilities.scrollTo({
				target: ScrollTrigger.maxScroll(window),
				cb: () => {
					this.transitionActive = false;
				}
			});
		}
	}

	_onResize() {
		this._updateMask();

		if (this.curtains && this.curtains.instance) {
			this.curtains.instance.resize();
		}
	}

	// WebGL methods
	_initCurtains(module) {
		let options = {
			planes: {
				widthSegments: 16,
				heightSegments: 16,
				uniforms: {
					opacity: {
						name: 'uOpacity',
						type: '1f',
						value: 1
					}
				},
				visible: true,
				vertexShader: this._vShaderPlane(),
				fragmentShader: this._fShaderPlane()
			}
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

		this._initFirstPlane();
	}

	_initFirstPlane() {
		const firstPlane = this.curtains.instance.planes[0];

		if (firstPlane) {
			firstPlane.onReady(() => {
				const animation = {
					scale: 1,
					scaleTexture: 1,
				};

				firstPlane.transformOrigin.x = 0.5;
				firstPlane.transformOrigin.y = 0.5;
				firstPlane.transformOrigin.z = 0.5;

				gsap.to(animation, {
					scale: typeof this.options.onSceneIdle.scalePlane === 'number' ? this.options.onSceneIdle.scalePlane : 1,
					scaleTexture: typeof this.options.onSceneIdle.scaleTexture === 'number' ? this.options.onSceneIdle.scaleTexture : 1,
					duration: 0.6,
					ease: 'expo.inOut',
					onUpdate: () => {
						firstPlane.scale.x = animation.scale;
						firstPlane.scale.y = animation.scale;

						if (firstPlane.textures.length) {
							firstPlane.textures.forEach((texture) => {
								texture.scale.x = animation.scaleTexture;
								texture.scale.y = animation.scaleTexture;
							});
						}
					}
				});

				this._setWebGLReady();
			});
		}
	}

	_onVisibleUpdate(entries) {
		entries.forEach((entry) => {
			if (this.curtains && this.curtains.instance) {
				if (entry.isIntersecting) {
					this.curtains.instance.enableDrawing();
				} else {
					this.curtains.instance.disableDrawing();
				}
			}
		});
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

export default class CurtainsBase {
	constructor({
		element,
		container,
		lanes,
		options
	}) {
		this.planes = {}; // Groups of planes like "0: []", "1: []", etc
		this._handlers = {
			success: this._onSuccess.bind(this),
			error: this._onError.bind(this),
			contextLost: this._onContextLost.bind(this),
			mouseMove: this._onMouseMove.bind(this),
			hoverIn: this._onMouseEnter.bind(this),
			hoverOut: this._onMouseLeave.bind(this),
		};
		this._tlHover = gsap.timeline({
			defaults: {
				duration: 2.4,
				ease: 'power3.out'
			}
		});

		this.defaults = {
			planes: {
				widthSegments: 16,
				heightSegments: 16,
				visible: false, // hide the plane while it's empty
				autoloadSources: false,
				uniforms: {
					time: {
						name: 'uTime',
						type: '1f',
						value: 0,
					},
					velocityX: {
						name: 'uVelocityX',
						type: '1f',
						value: 0,
					},
					velocityY: {
						name: 'uVelocityY',
						type: '1f',
						value: 0,
					},
					elasticEffect: {
						name: 'uElasticEffect',
						type: '1f',
						value: 0,
					},
					mousePosition: {
						name: 'uMousePosition',
						type: '2f',
						value: [0, 0]
					},
					viewportSizes: {
						name: 'uViewportSizes',
						type: '2f',
						value: [0, 0]
					},
					planeSizes: {
						name: 'uPlaneSizes',
						type: '2f',
						value: [0, 0]
					},
					imageSizes: {
						name: 'uImageSizes',
						type: '2f',
						value: [0, 0]
					},
					opacity: {
						name: 'uOpacity',
						type: '1f',
						value: 1
					},
					transition: {
						name: 'uTransition',
						type: '1f',
						value: 0
					},
					hovered: {
						name: 'uHovered',
						type: '1f',
						value: 0
					},
					hoverSpeed: {
						name: 'uHoverSpeed',
						type: '1f',
						value: 1
					},
					hoverAmplitude: {
						name: 'uHoverAmplitude',
						type: '1f',
						value: 1
					},
					hoverSegments: {
						name: 'uHoverSegments',
						type: '1f',
						value: 4
					}
				},
				onRender: (plane) => {
					plane.uniforms.time.value++;
				}
			},
			elasticEffect: 1,
			onHoverIn: {
				hovered: 1,
				speed: 8,
				amplitude: 2,
				segments: 8,
				opacity: 1,
				scalePlane: 1,
				scaleTexture: 1,
			},
			onHoverInOthers: {
				opacity: false,
				scalePlane: false,
				scaleTexture: false,
			},
			onHoverOut: {
				hovered: 0,
				speed: 1,
				amplitude: 1,
				segments: 4,
				opacity: false,
				scalePlane: false,
				scaleTexture: false,
			},
			onContextLost: (instance) => {

			},
			hasCurtainsClass: 'has-curtains',
			noCurtainsClass: 'no-curtains',
			textureSourceAttribute: 'data-texture-src',
			itemIdAttribute: 'data-post-id',
			watchMouseMove: false,
			antialias: true,
			watchScroll: 'auto',
			autoResize: false,
			autoRender: false,
			pixelRatio: Math.min(1.5, window.devicePixelRatio)
		};
		this.element = element;
		this.lanes = lanes;
		this.container = container || element;
		this.options = deepmerge(this.defaults, options);

		this.init();
	}

	init() {
		this._initCurtains();

		if (!!this.options.planes) {
			this._adjustOptions();
			this._loadPlanes();
		}

		this._attachEvents();
	}

	destroy() {
		this._detachEvents();

		if (!!this.instance) {
			if (!this.options.autoRender) {
				gsap.ticker.remove(this.instance.render.bind(this.instance));
			}

			this.instance.dispose();
			this.instance = null;
		}
	}

	resetPlanesTranslation(planes = this.instance.planes) {
		if (planes.length) {
			planes.forEach((plane) => {
				plane.relativeTranslation.x = 0;
				plane.relativeTranslation.y = 0;
				plane.relativeTranslation.z = 0;
			});
		}
	}

	resetPlanesScale(planes = this.instance.planes) {
		if (planes.length) {
			planes.forEach((plane) => {
				plane.scale.x = 1;
				plane.scale.y = 1;
			});
		}
	}

	resetPlanesVisibility(condition = null, planes = this.instance.planes) {
		if (planes.length) {
			planes.forEach((plane) => {
				if (condition !== null) {
					plane.visible = condition;
				} else {
					// Plane is not "display: none"
					plane.visible = !!plane.htmlElement.offsetParent;
				}

				plane.uniforms.opacity.value = 1;
			});
		}
	}

	resetPlanesVelocity(planes = this.instance.planes) {
		if (planes.length) {
			planes.forEach((plane) => {
				plane.uniforms.velocityX.value = 0;
				plane.uniforms.velocityY.value = 0;
			});
		}
	}

	loadPlane(indexLane, element) {
		if (!element instanceof HTMLElement) {
			return;
		}

		if (!this.planes[indexLane]) {
			this.planes[indexLane] = [];
		}

		const mediaTexture = element.querySelector(`img[${this.options.textureSourceAttribute}]`);

		if (mediaTexture) {
			const
				planeElement = mediaTexture.parentElement,
				plane = new Plane(this.instance, planeElement, this.options.planes);

			this.planes[indexLane].push(plane);

			this._assignPlaneUserData(plane);
			this._loadPlaneTexture(plane, this.textureOptions);
			this._addPlaneRenderCallback(plane);
		}
	}

	_attachEvents() {
		this.instance
			.onSuccess(this._handlers.success)
			.onError(this._handlers.error)
			.onContextLost(this._handlers.contextLost);

		if (!!this.options.watchMouseMove) {
			this.mouse = new Vec2();
			this.lastMouse = this.mouse.clone();
			this.mouseVelocity = new Vec2();
			this.updateVelocity = false;

			window.addEventListener('mousemove', this._handlers.mouseMove);
			window.addEventListener('touchmove', this._handlers.mouseMove, {
				passive: true
			});
		}

		if (!!this.options.planes && !!this.options.onHoverIn && !!this.options.onHoverIn) {
			app.hoverEffect.attachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);
		}

		this.container.addEventListener('loadPlane', (event) => {
			const { trigger, nextElement, nextElementMedia, callback } = event.detail;

			this._loadTransitionPlane({
				element: trigger,
				target: nextElement,
				targetMedia: nextElementMedia,
				callback
			});
		});

		this.container.addEventListener('translatePlane', (event) => {
			const { trigger, nextElement, nextElementMedia, callback, offsetTop, duration } = event.detail;

			if (offsetTop > 0) {
				this.instance.updateScrollValues(0, offsetTop);
				this.instance.resize();
			}

			this._translatePlaneTo({
				duration,
				offsetTop,
				element: trigger,
				target: nextElement,
				targetMedia: nextElementMedia,
				callback
			});
		});
	}

	_detachEvents() {
		if (!!this.options.watchMouseMove) {
			window.removeEventListener('mousemove', this._handlers.mouseMove);
			window.removeEventListener('touchmove', this._handlers.mouseMove, {
				passive: true
			});
		}

		if (!!this.options.planes && !!this.options.onHoverIn && !!this.options.onHoverIn) {
			app.hoverEffect.detachEvents(this.element, this._handlers.hoverIn, this._handlers.hoverOut);
		}
	}

	_initCurtains() {
		let watchScroll = this.options.watchScroll;

		if (this.options.watchScroll === 'auto') {
			watchScroll = false;
		} else {
			watchScroll = window.getComputedStyle(this.container).position === 'fixed' ? true : false;
		}

		this.instance = new Curtains({
			antialias: this.options.antialias,
			container: this.container,
			depth: false,
			watchScroll,
			// premultipliedAlpha: true,
			autoResize: this.options.autoResize,
			autoRender: this.options.autoRender,
			pixelRatio: this.options.pixelRatio,
			production: true
		});

		this.textureOptions = {
			premultiplyAlpha: true,
			// minFilter: this.instance.gl.LINEAR_MIPMAP_NEAREST,
			anisotropy: 16,
			floatingPoint: 'half-float'
		};

		if (!this.options.autoRender) {
			gsap.ticker.add(this.instance.render.bind(this.instance));
		}
	}

	_adjustOptions() {
		this.options.planes.uniforms.viewportSizes.value = this._getViewportSize();
		this.options.planes.uniforms.elasticEffect.value = this.options.elasticEffect;

		if (!!this.options.onHoverOut) {
			if (typeof this.options.onHoverOut.speed === 'number') {
				this.options.planes.uniforms.hoverSpeed.value = this.options.onHoverOut.speed;
			}

			if (typeof this.options.onHoverOut.amplitude === 'number') {
				this.options.planes.uniforms.hoverAmplitude.value = this.options.onHoverOut.amplitude;
			}

			if (typeof this.options.onHoverOut.segments === 'number') {
				this.options.planes.uniforms.hoverSegments.value = this.options.onHoverOut.segments;
			}
		}
	}

	_loadPlanes() {
		this.lanes.forEach((lane, indexLane) => {
			const mediaTextures = [...lane.querySelectorAll(`img[${this.options.textureSourceAttribute}]`)];

			this.planes[indexLane] = [];

			if (mediaTextures.length) {
				mediaTextures.forEach((element, indexPlane) => {
					const
						planeElement = element.parentElement,
						plane = new Plane(this.instance, planeElement, this.options.planes);

					this.planes[indexLane][indexPlane] = plane;

					this._assignPlaneUserData(plane);
					this._loadPlaneTexture(plane, this.textureOptions);
					this._addPlaneRenderCallback(plane);
				});
			}
		});
	}

	_loadPlaneTexture(plane, textureOptions = {}) {
		const
			planeImage = plane.htmlElement instanceof HTMLElement && plane.htmlElement.querySelector(`img[${this.options.textureSourceAttribute}]`),
			planeVideo = plane.htmlElement instanceof HTMLElement && plane.htmlElement.querySelector(`video`);

		if (planeImage && !planeVideo) {
			this._loadPlaneImage(plane, planeImage, textureOptions);
		}

		if (planeVideo) {
			this._loadPlaneVideo(plane, planeVideo, textureOptions);
		}
	}

	_loadPlaneImage(plane, element, textureOptions = {}) {
		const
			width = element.getAttribute('width'),
			height = element.getAttribute('height'),
			image = new Image(width, height);

		image.decoding = 'async';
		image.crossOrigin = 'anonymous';
		image.src = element.getAttribute('data-texture-src');

		if (width && height) {
			if (!plane.htmlElement.closest('.custom-aspect-ratio')) {
				plane.htmlElement.style.setProperty('--media-width', width);
				plane.htmlElement.style.setProperty('--media-height', height);
				plane.htmlElement.classList.add('has-aspect-ratio');
				plane.resize();
			}
		}

		plane.loadImage(image, textureOptions, (texture) => {
			this._setTextureReady(element);
			this._setPlaneSize(plane, width, height);
		});
	}

	_loadPlaneVideo(plane, element, textureOptions = {}) {
		const
			image = element.parentElement.querySelector('img');

		let width, height;

		if (image) {
			width = image.getAttribute('width');
			height = image.getAttribute('height');
		} else {
			width = element.getAttribute('width');
			height = element.getAttribute('height');
		}

		// element.src = element.getAttribute(`${this.options.textureSourceAttribute}`);

		if (!plane.htmlElement.closest('.custom-aspect-ratio') && width && height) {
			plane.htmlElement.style.setProperty('--media-width', width);
			plane.htmlElement.style.setProperty('--media-height', height);
			plane.htmlElement.classList.add('has-aspect-ratio');
			plane.resize();
		}

		plane.loadVideo(element, textureOptions, (texture) => {
			this._setTextureReady(element);

			if (width && height) {
				this._setPlaneSize(plane, width, height);
				// plane.htmlElement.style.setProperty('--media-width', width);
				// plane.htmlElement.style.setProperty('--media-height', height);
				// plane.htmlElement.classList.add('has-aspect-ratio');
			}

			// const tex = plane.addTexture(texture);
			// Replace image texture (if it's present) with the video
			// tex.setSource(texture.source);
			// if (plane.textures[0]) {
			// 	plane.textures[0].setSource(texture.source);
			// }
			plane.playVideos();
		});

		plane.onLoading(plane.playVideos.bind(plane));
	}

	_loadTexturesBackToDOM() {
		if (!!this.instance && this.instance.planes.length) {
			this.instance.planes.forEach((plane) => {
				if (plane.textures.length) {
					plane.textures.forEach((texture, index) => {
						const originalElements = [...plane.htmlElement.querySelectorAll('img, video')];

						originalElements.forEach((originalTextureElement) => {
							const originalSource = originalTextureElement.getAttribute(`${this.options.textureSourceAttribute}`);

							originalTextureElement.setAttribute('src', originalSource);
						});
					});
				}
			});
		}
	}

	_assignPlaneUserData(plane) {
		if (typeof this.options.itemIdAttribute === 'string' && plane && plane.htmlElement instanceof HTMLElement) {
			const IDElement = plane.htmlElement.closest(`[${this.options.itemIdAttribute}]`);

			if (IDElement) {
				Object.assign(plane, {
					userData: {
						postId: IDElement.getAttribute(`${this.options.itemIdAttribute}`)
					}
				});
			}
		}
	}

	_addPlaneRenderCallback(plane) {
		if (typeof this.options.planes.onRender === 'function') {
			plane.onRender(() => this.options.planes.onRender(plane));
		}
	}

	_setTextureReady(element, ready = true) {
		element.classList.toggle('loaded', ready);
	}

	_setPlaneSize(plane, width, height) {
		plane.uniforms.planeSizes.value = [plane.scale.x, plane.scale.y];
		plane.uniforms.imageSizes.value = [width, height];
	}

	_onSuccess() {
		this.element.classList.remove(`${this.options.noCurtainsClass}`);
		this.element.classList.add(`${this.options.hasCurtainsClass}`);
	}

	_onError() {
		this.element.classList.remove(`${this.options.hasCurtainsClass}`);
		this.element.classList.add(`${this.options.noCurtainsClass}`);
		this._loadTexturesBackToDOM();
	}

	_onContextLost() {
		if (!!this.instance) {
			// On WebGL context lost, try to restore the context
			this.instance.restoreContext();

			if (typeof this.options.onContextLost === 'function') {
				this.options.onContextLost(this.instance);
			}
		}
	}

	_getViewportSize(fieldOfView = 45, positionZ = 5) {
		const
			fov = fieldOfView * (Math.PI / 180),
			height = 2 * Math.tan(fov / 2) * positionZ,
			width = height * (this.container.offsetWidth / this.container.offsetHeight);

		return [width, height];
	}

	_onMouseMove(event) {
		// velocity is our mouse position minus our mouse last position
		this.lastMouse.copy(this.mouse);

		if (event.targetTouches) {
			this.mouse.set(event.targetTouches[0].clientX, event.targetTouches[0].clientY);
		} else {
			this.mouse.set(event.clientX, event.clientY);
		}

		const frameDuration = gsap.ticker.deltaRatio();

		// divided by a frame duration (roughly)
		this.mouseVelocity.set(
			(this.mouse.x - this.lastMouse.x) * frameDuration,
			(this.mouse.y - this.lastMouse.y) * frameDuration
		);

		for (const [indexLane, lane] of Object.entries(this.planes)) {
			lane.forEach((plane, indexPlane) => {
				plane.uniforms.mousePosition.value = plane.mouseToPlaneCoords(this.mouse);
			});
		}

		// we should update the velocity
		this.updateVelocity = true;
	}

	_onMouseEnter(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._tlHover.clear();

			for (const [indexLane, lane] of Object.entries(this.planes)) {
				lane.forEach((plane) => {
					// Current plane
					if (this._isCurrentPlane(plane, target)) {
						this._tlHover
							.to(plane.uniforms.hovered, {
								value: this.options.onHoverIn.hovered
							}, 'start')
							.to(plane.uniforms.hoverSpeed, {
								value: this.options.onHoverIn.speed
							}, 'start')
							.to(plane.uniforms.hoverAmplitude, {
								value: this.options.onHoverIn.amplitude
							}, 'start')
							.to(plane.uniforms.hoverSegments, {
								value: this.options.onHoverIn.segments
							}, 'start');

						if (!!this.options.onHoverIn) {
							if (typeof this.options.onHoverIn.opacity === 'number') {
								this._tlHover.to(plane.uniforms.opacity, {
									value: 1,
									duration: 0.6,
									ease: 'power3.out'
								}, 'start');
							}

							if (typeof this.options.onHoverIn.scalePlane === 'number') {
								const animation = {
									scaleX: plane.scale.x,
									scaleY: plane.scale.y,
								};

								this._tlHover.to(animation, {
									scaleX: this.options.onHoverIn.scalePlane,
									scaleY: this.options.onHoverIn.scalePlane,
									duration: 0.6,
									ease: 'power3.out',
									onUpdate: () => {
										plane.scale.x = animation.scaleX;
										plane.scale.y = animation.scaleX;
									}
								}, 'start');
							}

							if (typeof this.options.onHoverIn.scaleTexture === 'number' && plane.textures[0] && 'scale' in plane.textures[0]) {
								const animation = {
									scaleX: plane.textures[0].scale.x,
									scaleY: plane.textures[0].scale.y,
								};

								this._tlHover.to(animation, {
									scaleX: this.options.onHoverIn.scaleTexture,
									scaleY: this.options.onHoverIn.scaleTexture,
									duration: 0.6,
									ease: 'power3.out',
									onUpdate: () => {
										if (plane.textures.length) {
											plane.textures.forEach((texture) => {
												texture.scale.x = animation.scaleX;
												texture.scale.y = animation.scaleY;
											});
										}
									}
								}, 'start');
							}
						}
					} else { // Other planes
						this._tlHover
							.to(plane.uniforms.hovered, {
								value: 0
							}, 'start')
							.to(plane.uniforms.hoverSpeed, {
								value: 0
							}, 'start')
							.to(plane.uniforms.hoverAmplitude, {
								value: 0
							}, 'start')
							.to(plane.uniforms.hoverSegments, {
								value: 0
							}, 'start')

						if (!!this.options.onHoverInOthers) {
							if (typeof this.options.onHoverInOthers.opacity === 'number') {
								this._tlHover.to(plane.uniforms.opacity, {
									value: this.options.onHoverInOthers.opacity,
									duration: 0.6,
									ease: 'power3.out'
								}, 'start');
							}

							if (typeof this.options.onHoverInOthers.scalePlane === 'number') {
								const animation = {
									scaleX: plane.scale.x,
									scaleY: plane.scale.y,
								};

								this._tlHover.to(animation, {
									scaleX: this.options.onHoverInOthers.scalePlane,
									scaleY: this.options.onHoverInOthers.scalePlane,
									duration: 0.6,
									ease: 'power3.out',
									onUpdate: () => {
										plane.scale.x = animation.scaleX;
										plane.scale.y = animation.scaleX;
									}
								}, 'start');
							}

							if (typeof this.options.onHoverInOthers.scaleTexture === 'number' && plane.textures[0]) {
								const animation = {
									scaleX: plane.textures[0].scale.x,
									scaleY: plane.textures[0].scale.y,
								};

								this._tlHover.to(animation, {
									scaleX: this.options.onHoverInOthers.scaleTexture,
									scaleY: this.options.onHoverInOthers.scaleTexture,
									duration: 0.6,
									ease: 'power3.out',
									onUpdate: () => {
										if (plane.textures.length) {
											plane.textures.forEach((texture) => {
												texture.scale.x = animation.scaleX;
												texture.scale.y = animation.scaleY;
											});
										}
									}
								}, 'start');
							}
						}
					}
				});
			}
		}
	}

	_onMouseLeave(event) {
		const target = app.utilities.getLinkTarget(event);

		if (target) {
			this._tlHover.clear();

			for (const [indexLane, lane] of Object.entries(this.planes)) {
				lane.forEach((plane) => {
					this._tlHover
						.to(plane.uniforms.hovered, {
							value: this.options.onHoverOut.hovered
						}, 'start')
						.to(plane.uniforms.hoverSpeed, {
							value: this.options.onHoverOut.speed
						}, 'start')
						.to(plane.uniforms.hoverAmplitude, {
							value: this.options.onHoverOut.amplitude
						}, 'start')
						.to(plane.uniforms.hoverSegments, {
							value: this.options.onHoverOut.segments
						}, 'start');

					if (!!this.options.onHoverOut) {
						if (typeof this.options.onHoverOut.opacity === 'number') {
							this._tlHover.to(plane.uniforms.opacity, {
								value: this.options.onHoverOut.opacity,
								duration: 0.6,
								ease: 'power3.out'
							}, 'start');
						}

						if (typeof this.options.onHoverOut.scalePlane === 'number') {
							const animation = {
								scaleX: plane.scale.x,
								scaleY: plane.scale.y,
							};

							this._tlHover.to(animation, {
								scaleX: this.options.onHoverOut.scalePlane,
								scaleY: this.options.onHoverOut.scalePlane,
								duration: 0.6,
								ease: 'power3.out',
								onUpdate: () => {
									plane.scale.x = animation.scaleX;
									plane.scale.y = animation.scaleX;
								}
							}, 'start');
						}

						if (typeof this.options.onHoverOut.scaleTexture === 'number' && plane.textures[0] && 'scale' in plane.textures[0]) {
							const animation = {
								scaleX: plane.textures[0].scale.x,
								scaleY: plane.textures[0].scale.y,
							};

							this._tlHover.to(animation, {
								scaleX: this.options.onHoverOut.scaleTexture,
								scaleY: this.options.onHoverOut.scaleTexture,
								duration: 0.6,
								ease: 'power3.out',
								onUpdate: () => {
									if (plane.textures.length) {
										plane.textures.forEach((texture) => {
											texture.scale.x = animation.scaleX;
											texture.scale.y = animation.scaleY;
										});
									}
								}
							}, 'start');
						}
					}
				});
			}
		}
	}

	_isCurrentPlane(plane, target) {
		if (plane.userData) {
			if (plane.userData.transitionPlane && plane.userData.transitionPlane === true) {
				return true;
			}

			if (plane.userData.postId && typeof this.options.itemIdAttribute === 'string') {
				const postIDElement = target.closest(`[${this.options.itemIdAttribute}]`);

				return postIDElement && plane.userData.postId === postIDElement.getAttribute(`${this.options.itemIdAttribute}`);
			}
		}

		return target.contains(plane.htmlElement);
	}

	_getParsedObjectPosition(element) {
		const result = [50, 50]; // default

		if (element instanceof HTMLElement) {
			const objectPosition = window.getComputedStyle(element).objectPosition;

			if (objectPosition) {
				return objectPosition.split(' ').map(val => parseFloat(val));
			}
		}

		return result;
	}

	_hasPlaneTargetMedia(plane, targetMedia) {
		return (
			plane.images.filter((img) => img.currentSrc === targetMedia.currentSrc).length ||
			plane.videos.filter((video) => video.currentSrc === targetMedia.currentSrc).length
		);
	}

	_loadTransitionPlane({
		element,
		target,
		targetMedia = null,
		callback
	}) {
		let result = {
			plane: null,
			indexLane: undefined,
			indexPlane: undefined,
			indexTexture: 0
		};

		let currentPlaneTarget = {
			plane: null,
			indexLane: undefined,
			indexPlane: undefined,
			indexTexture: 0
		};

		for (const [indexLane, lane] of Object.entries(this.planes)) {
			lane.forEach((plane, indexPlane) => {
				if (element.contains(plane.htmlElement)) {
					const data = {
						plane,
						indexLane: parseInt(indexLane.toString(), 10),
						indexPlane
					};

					currentPlaneTarget = data;

					if (this._hasPlaneTargetMedia(plane, targetMedia)) {
						result = data;
					}
				}
			});
		}

		if (!result.plane) {
			for (const [indexLane, lane] of Object.entries(this.planes)) {
				lane.forEach((plane, indexPlane) => {
					if (!result.plane) {
						const data = {
							plane,
							indexLane: parseInt(indexLane.toString(), 10),
							indexPlane
						};

						if (!currentPlaneTarget.plane && this._isCurrentPlane(plane, element)) {
							currentPlaneTarget = data;
						}

						if (this._hasPlaneTargetMedia(plane, targetMedia)) {
							result = data;
						}
					}
				});
			};
		}

		if (result.plane) {
			Object.assign(result.plane.userData, {
				transitionPlane: true
			});

			if (typeof callback === 'function') {
				callback(result);
			}
		} else {
			currentPlaneTarget.plane.loadImage(targetMedia, {}, (t) => {
				Object.assign(currentPlaneTarget.plane.userData, {
					transitionPlane: true
				});

				if (typeof callback === 'function') {
					callback(currentPlaneTarget);
				}
			});
		}
	}

	_getTextureByMediaSrc({
		plane,
		targetMedia
	}) {
		let activeTextureIndex = 0;

		plane.textures.forEach((texture, index) => {
			if (texture.source.src === targetMedia.src) {
				activeTextureIndex = index;
			}
		});

		return activeTextureIndex;
	}

	_translatePlaneTo({
		element = null,
		target = null,
		targetMedia = null,
		callback,
		offsetLeft = 0,
		offsetTop = 0,
		duration = 2.0,
		ease = 'expo.inOut'
	}) {
		const { pixelRatio } = this.instance;
		const tl = gsap.timeline({
			onComplete: () => {
				if (typeof callback === 'function') {
					callback();
				}
			}
		});
		let transitionPlane;

		this._tlHover.clear();
		this._detachEvents();

		// tl.to(this.instance.container, {
		// 	x: 0,
		// 	y: 0,
		// 	overwrite: true,
		// 	duration,
		// 	ease,
		// }, 'start');

		for (const [indexLane, lane] of Object.entries(this.planes)) {
			lane.forEach((plane, indexPlane) => {
				if (plane.userData && plane.userData.transitionPlane) {
					transitionPlane = plane;
				}
			})
		}

		for (const [indexLane, lane] of Object.entries(this.planes)) {
			lane.forEach((plane, indexPlane) => {
				const
					// isCurrentPlane = this._isCurrentPlane(plane, element),
					animation = {
						hovered: plane.uniforms.hovered.value,
						hoverAmplitude: plane.uniforms.hoverAmplitude.value,
						hoverSegments: plane.uniforms.hoverSegments.value,
					};

				this._tlHover.to(animation, {
					hovered: 0,
					hoverAmplitude: 0,
					hoverSegments: 0,
					onUpdate: () => {
						plane.uniforms.hovered.value = animation.hovered;
						plane.uniforms.hoverAmplitude.value = animation.hoverAmplitude;
						plane.uniforms.hoverSegments.value = animation.hoverSegments;
					}
				}, 'start');

				// Current plane
				if (plane === transitionPlane && this._hasPlaneTargetMedia(plane, targetMedia)) {

					if (offsetTop > 0) {
						app.utilities.scrollTo({ target: 0, duration: 0 });
						ScrollTrigger.refresh(false);
					}

					let activeTextureIndex = this._getTextureByMediaSrc({ plane, targetMedia });

					// Put the current plane in front
					plane.setRenderOrder(1);

					// Swap texture
					if (targetMedia.src !== plane.textures[0].source.src) {
						tl.set({}, {
							delay: duration / 2,
							onComplete: () => {
								if (activeTextureIndex > 0) {
									plane.textures.forEach((texture, index) => {
										if (activeTextureIndex === index) {
											plane.textures[0].setSource(texture.source);
										}
									});
								}
							}
						}, 'start');
					}

					const planeBoundingRect = plane.getBoundingRect();


					// Target
					const targetRect = target.getBoundingClientRect();

					if (targetMedia.tagName === 'VIDEO' && plane.videos.length) {
						plane.videos.forEach((videoEl) => {
							targetMedia.currentTime = videoEl.currentTime;
						});
					}

					const
						textureScale = gsap.getProperty(targetMedia, 'scale'),
						textureOffsetX = parseFloat(gsap.getProperty(targetMedia, 'x', '%')),
						textureOffsetY = parseFloat(gsap.getProperty(targetMedia, 'y', '%'));

					// Starting values
					const animation = {
						opacity: plane.uniforms.opacity.value,
						scaleX: plane.scale.x,
						scaleY: plane.scale.y,
						translateX: plane.relativeTranslation.x,
						translateY: plane.relativeTranslation.y,
						textureOffsetX: 0,
						textureOffsetY: 0,
						textureScale: 1,
						transition: 0,
						velocityX: plane.uniforms.velocityX.value,
						velocityY: plane.uniforms.velocityY.value,
						transformOriginX: plane.transformOrigin.x,
						transformOriginY: plane.transformOrigin.y,
						transformOriginZ: plane.transformOrigin.z
					};

					tl.to(animation, {
						opacity: 1,
						transformOriginX: 0.5,
						transformOriginY: 0.5,
						transformOriginZ: 0.5,
						duration: 0.2,
						onStart: () => {
							plane.visible = true;
						},
						onUpdate: () => {
							// Restore current plane opacity
							plane.uniforms.opacity.value = animation.opacity;

							// Take "center center" as plane transform origin
							plane.transformOrigin.x = animation.transformOriginX;
							plane.transformOrigin.y = animation.transformOriginY;
							plane.transformOrigin.z = animation.transformOriginZ;
						}
					}, 'start');


					const { width, height } = getImageSize({
						container: { width: targetRect.width, height: targetRect.height },
						image: { width: plane.textures[activeTextureIndex].source.width, height: plane.textures[activeTextureIndex].source.height },
						size: 'cover'
					});

					const aspectRatioContainer = targetRect.height / targetRect.width;
					const aspectRatioCover = height / width;
					const adjustmentMultiplierX = aspectRatioContainer > aspectRatioCover ? aspectRatioContainer / aspectRatioCover : 1;
					const adjustmentMultiplierY = aspectRatioContainer > aspectRatioCover ? 1 : aspectRatioCover / aspectRatioContainer;

					tl.to(animation, {
						scaleX: targetRect.width / planeBoundingRect.width * pixelRatio,
						scaleY: targetRect.height / planeBoundingRect.height * pixelRatio,
						translateX: -1 * ((planeBoundingRect.left + planeBoundingRect.width / 2)) / pixelRatio + (targetRect.left + targetRect.width / 2),
						translateY: -1 * ((planeBoundingRect.top + planeBoundingRect.height / 2)) / pixelRatio + (targetRect.top + targetRect.height / 2),
						textureOffsetX: -textureOffsetX / textureScale / 100 / adjustmentMultiplierX,
						textureOffsetY: textureOffsetY / textureScale / 100 / adjustmentMultiplierY,
						textureScale: textureScale,
						transition: 1,
						velocityX: 0,
						velocityY: 0,
						ease,
						duration,
						onStart: () => {
							// Force render
							this.instance.needRender();
						},
						onUpdate: () => {
							// Plane scale
							plane.scale.x = animation.scaleX;
							plane.scale.y = animation.scaleY;

							// Plane translation
							plane.relativeTranslation.x = animation.translateX;
							plane.relativeTranslation.y = animation.translateY;

							// Textures scale
							if (plane.textures.length) {
								plane.textures.forEach((texture) => {
									texture.offset.x = animation.textureOffsetX;
									texture.offset.y = animation.textureOffsetY;

									texture.scale.x = animation.textureScale;
									texture.scale.y = animation.textureScale;
								});
							}

							// Transition animation
							plane.uniforms.transition.value = animation.transition;

							// Smoothly reset the current velocity
							plane.uniforms.velocityX.value = animation.velocityX;
							plane.uniforms.velocityY.value = animation.velocityY;

							// Force render
							this.instance.needRender();
						},
						onComplete: () => {
							// Force render
							this.instance.needRender();
						}
					}, 'start');

				} else { // Other planes
					plane.setRenderOrder(0);

					const animation = {
						opacity: plane.uniforms.opacity.value
					};

					// Hide other planes
					tl.to(animation, {
						opacity: 0,
						duration: 0.3,
						onUpdate: () => {
							plane.uniforms.opacity.value = animation.opacity;
						},
						onComplete: () => {
							plane.visible = false;
						}
					}, 'start');
				}
			});

			function getImageSize(options) {
				const ratios = {
					cover: function (wRatio, hRatio) {
						return Math.max(wRatio, hRatio);
					},

					contain: function (wRatio, hRatio) {
						return Math.min(wRatio, hRatio);
					},

					// original size
					"auto": function () {
						return 1;
					},

					// stretch
					"100% 100%": function (wRatio, hRatio) {
						return { width: wRatio, height: hRatio };
					}
				};

				if (!ratios[options.size]) {
					throw new Error(`${options.size} not found in ratios`);
				}

				const r = ratios[options.size](
					options.container.width / options.image.width,
					options.container.height / options.image.height
				);

				return {
					width: options.image.width * (r.width || r),
					height: options.image.height * (r.height || r)
				};
			}
		}
	}
}

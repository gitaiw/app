export default class AJAX extends BaseComponent {
	constructor({
		name,
		loadInnerComponents,
		parent,
		element,
		options
	}) {
		super({
			name,
			loadInnerComponents,
			parent,
			element,
			// External options from app.options.ajax
			defaults: options,
			// Component inner elements
			innerElements: {
				block: '#page-blocking-curtain',
				indicator: '#loading-indicator'
			}
		});
		this._handlers = {
			onTransitionStart: this._transitionStart.bind(this),
			onTransitionEnd: this._transitionEnd.bind(this),
			onTransitionInit: app.initAJAX.bind(app)
		};

		this.instance = null;
		this.running = false;
		this.webpSupported = false;
		this.runningSeamlessTransition = false;

		this.setup();
	}

	init() {
		this._testWebP().then(() => {
			this._createBarbaInstance();
			this._attachEvents();
			this._setScrollRestoration();
		});
	}

	_createBarbaInstance() {
		this.instance = barba.init({
			timeout: this.options.timeout,
			prevent: this._prevent.bind(this),
			// custom transitions
			transitions: [
				AJAXTransitionFlyingImage,
				AJAXTransitionAutoScrollNext,
				AJAXTransitionGeneral
			],
			customHeaders: this._customHeaders.bind(this)
		});
	}

	_attachEvents() {
		document.addEventListener('arts/barba/transition/start', this._handlers.onTransitionStart);
		document.addEventListener('arts/barba/transition/end', this._handlers.onTransitionEnd);
		document.addEventListener('arts/barba/transition/init/after', this._handlers.onTransitionInit);
	}

	_prevent({ el }) {
		let
			url = el.getAttribute('href'),
			customRules = !!this.options.preventRules && this.options.preventRules.length ? AJAXHelpers.sanitizeSelector(this.options.preventRules) : null,
			exludeRules = [
				'.has-click-and-hold',
				'.has-click-and-hold a',
				'.no-ajax',
				'.no-ajax a',
				'[data-elementor-open-lightbox]', // Elementor lightbox gallery
				'[data-elementor-lightbox-slideshow]', // Elementor Pro Gallery
				'.lang-switcher a', // language switcher area
				'.widget_polylang a',
				'.trp-language-switcher a',
				'.wpml-ls-item a',
				'[data-arts-component-name="PSWP"] a', // Links in template galleries
			];

		// Element is outside barba wrapper
		if (!this.element.contains(el)) {
			return true;
		}

		if (url === '#') { // dummy link
			return true;
		}

		// Page anchor
		if (el.matches('[href*="#"]') && window.location.href === url.substring(0, url.indexOf('#'))) {
			return true;
		}

		// Page anchor
		if (el.matches('[href^="#"]')) {
			return true;
		}

		// custom rules from WordPress Customizer
		if (customRules) {
			exludeRules = [...exludeRules, ...customRules.split(',')];
			exludeRules = [...new Set(exludeRules)];
		}

		// check against array of rules to prevent
		return el.matches(exludeRules.join(','));
	}

	_customHeaders() {
		if (this.webpSupported) {
			return {
				'name': 'Accept',
				'value': 'image/webp'
			};
		}
	}

	_testWebP() {
		return new Promise((resolve) => {
			const webP = new Image();

			webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
			webP.onload = webP.onerror = () => {
				webP.height === 2 ? this.webpSupported = true : this.webpSupported = false;
				resolve(true);
			};
		});
	}

	_transitionStart() {
		this.running = true;

		this._setScrollRestoration();

		app.utilities.scrollLock(true);
		app.utilities.pageLock(true);
		document.activeElement.blur();

		this._setLoading(true);
	}

	_transitionEnd() {
		this.running = false;
		this.runningSeamlessTransition = false;

		app.utilities.scrollLock(false);
		app.utilities.pageLock(false);

		this._setScrollRestoration();

		ScrollTrigger.refresh();

		// refresh animation triggers
		// for Waypoints library
		if (typeof Waypoint !== 'undefined') {
			Waypoint.refreshAll();
		}

		if (!!app.lazy && typeof app.lazy.update === 'function') {
			app.lazy.update();
		}

		app.utilities.scrollToAnchorFromHash();

		this._setLoading(false);
	}

	_setLoading(loading = true) {
		this._toggleCursorProgress(loading);
		this._toggleLoadingIndicator(loading);
		this.element.classList.toggle('ajax-loading', loading);
	}

	_toggleCursorProgress(enabled = true) {
		if (!!this.options.cursorLoading) {
			this.element.classList.toggle('cursor-progress', enabled);
		}
	}

	_toggleLoadingIndicator(enabled = true) {
		if (this.elements.indicator && this.elements.indicator[0]) {
			gsap.to(this.elements.indicator[0], {
				autoAlpha: enabled ? 1 : 0,
				duration: 0.3,
				overwrite: true
			});
		}
	}

	_setScrollRestoration(newValue = 'manual') {
		ScrollTrigger.clearScrollMemory(newValue);
	}
}

class AJAXAnimations {
	static animateCurtains(data, {
		duration = 2.4,
		ease = 'expo.inOut',
		motionOffsetX = '0vh',
		motionOffsetY = '10vh'
	} = {}) {
		return new Promise((resolve) => {
			const
				headerRef = app.componentsManager.getComponentByName('Header'),
				shouldInverseDirection = AJAXAnimations._shouldInverseDirection(data, headerRef);

			// Header overlay menu is opened
			if (headerRef && headerRef.instance.opened) {
				AJAXAnimations.animateContainersWithOpenedOverlayMenu(data, {
					duration,
					ease,
					motionOffsetX,
					motionOffsetY,
					shouldInverseDirection,
					headerRef
				}).then(() => AJAXHelpers.resolveOnNextTick(resolve));
			} else {
				AJAXAnimations.animateContainers(data, {
					duration,
					ease,
					motionOffsetX,
					motionOffsetY,
					shouldInverseDirection
				}).then(() => AJAXHelpers.resolveOnNextTick(resolve));
			}
		});
	}

	static animateContainersWithOpenedOverlayMenu(data, {
		duration = 2.4,
		ease = 'expo.inOut',
		motionOffsetX = '0vh',
		motionOffsetY = '10vh',
		shouldInverseDirection = false,
		headerRef
	} = {}) {
		return new Promise((resolve) => {
			app.utilities.scrollLock(false);

			AJAXHelpers.resetScrollPosition(0.2).then(() => {
				headerRef.instance.toggleOverlay(false);

				const
					headerTL = headerRef.instance.overlay.timeline,
					headerTLDuration = headerTL.duration(), // save original duration
					tl = gsap.timeline({
						defaults: {
							duration,
							ease
						},
						onComplete: () => {
							headerTL.duration(headerTLDuration);
							AJAXHelpers.resolveOnNextTick(resolve);
						}
					});

				tl
					.set(data.current.container, {
						opacity: 0
					})
					.set(data.next.content, {
						opacity: 1
					})
					.set(data.next.container, {
						opacity: 1,
						zIndex: 100,
						x: shouldInverseDirection ? `-${motionOffsetX}` : `${motionOffsetX}`,
						y: shouldInverseDirection ? `-${motionOffsetY}` : `${motionOffsetY}`
					})
					.to(data.next.container, {
						y: '0vh',
						x: '0vw'
					})
					.add(headerTL.duration(duration), '<');
				// .set(data.current.container, {
				// 	clearProps: 'transform,opacity,visibility'
				// });
			});
		});
	}

	static animateContainers(data, {
		duration = 2.4,
		ease = 'expo.inOut',
		motionOffsetX = '0vh',
		motionOffsetY = '10vh',
		shouldInverseDirection = false
	} = {}) {
		return new Promise((resolve) => {
			const
				backgroundColor = gsap.getProperty(data.next.container, 'backgroundColor'),
				tl = gsap.timeline({
					defaults: {
						duration,
						ease
					},
					onComplete: () => {
						AJAXHelpers.resolveOnNextTick(resolve);
					}
				});

			tl
				.set(document.body, {
					backgroundColor
				});

			[...data.current.container.querySelectorAll('.pin-spacer > *')].forEach((el) => {
				const isFixedPosition = gsap.getProperty(el, 'position') === 'fixed';

				if (isFixedPosition) {
					tl.set(el, {
						translateY: window.scrollY
					});
				}
			});

			tl
				.set(data.next.content, {
					opacity: 1
				})
				.set(data.next.container, {
					opacity: 1,
					zIndex: 100,
					x: shouldInverseDirection ? `-${motionOffsetX}` : `${motionOffsetX}`,
					y: shouldInverseDirection ? `-${motionOffsetY}` : `${motionOffsetY}`
				});

			tl.to(data.current.container, {
				x: shouldInverseDirection ? `${motionOffsetX}` : `-${motionOffsetX}`,
				y: shouldInverseDirection ? `${motionOffsetY}` : `-${motionOffsetY}`,
			}, '<')
				.to(data.current.content, {
					opacity: 0
				}, '<');

			tl
				.animateCurtain(data.next.container, {
					duration,
					animateFrom: shouldInverseDirection ? 'top' : 'bottom',
					clearProps: '',
					ease
				}, '<')
				.to(data.next.container, {
					y: '0vh',
					x: '0vw'
				}, '<');
		});
	}

	static hideContent(data, {
		duration = 0.2
	} = {}) {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => AJAXHelpers.resolveOnNextTick(resolve)
			});

			if (data.current.content) {
				tl.to(data.current.content, {
					duration,
					autoAlpha: 0
				}, '<');
			}

			if (data.next.content) {
				tl.set(data.next.content, {
					opacity: 0
				}, '<');
			}
		});
	}

	static animateMedia({
		cloneElement,
		nextElement,
		duration = 2.4,
		ease = 'expo.inOut'
	} = {}) {
		return new Promise((resolve) => {
			const
				tl = gsap.timeline({
					defaults: {
						duration,
						ease
					},
					onComplete: () => AJAXHelpers.resolveOnNextTick(resolve)
				}),
				currentMedia = cloneElement.querySelector('.js-ajax-transition-element__media'),
				currentMask = cloneElement.querySelector('.js-ajax-transition-element__mask'),
				currentOverlay = cloneElement.querySelector('.js-ajax-transition-element__overlay'),
				nextMedia = nextElement.querySelector('.js-ajax-transition-element__media'),
				nextOverlay = nextElement.querySelector('.js-ajax-transition-element__overlay'),
				getterElement = gsap.getProperty(nextElement),
				getterMedia = gsap.getProperty(nextMedia),
				isDifferentMediaSrc = nextMedia.src !== currentMedia.src,
				{ top, left, width, height } = nextElement.getBoundingClientRect(),
				x = getterMedia('x', '%'),
				y = getterMedia('y', '%'),
				offsetWidth = nextMedia.offsetWidth,
				offsetHeight = nextMedia.offsetHeight,
				scale = getterMedia('scale'),
				transformOrigin = getterMedia('transform-origin', '%'),
				objectFit = getterMedia('objectFit'),
				objectPosition = getterMedia('objectPosition');

			let clonedMedia;

			tl
				.set(nextElement, {
					autoAlpha: 0
				})
				.to(cloneElement, {
					top,
					left,
					width,
					height,
					overflow: () => getterElement('overflow'),
					borderRadius: () => getterElement('borderRadius'),
					'--shape-size': 100,
					// clipPath: () => getterElement('clipPath')
				}, 'start');

			if (currentOverlay && nextOverlay) {
				const opacity = gsap.getProperty(nextOverlay, 'opacity');

				tl.to(currentOverlay, {
					autoAlpha: opacity
				}, 'start');
			}

			if (currentOverlay && !nextOverlay) {
				tl.to(currentOverlay, {
					autoAlpha: 0
				}, 'start');
			}

			if (currentMask) {
				tl.to(currentMask, {
					transform: 'none',
					width: '100%',
					height: '100%',
					transformOrigin: 'center center'
				}, 'start');
			}

			if (isDifferentMediaSrc) {
				clonedMedia = currentMedia.cloneNode(true);

				clonedMedia.src = nextMedia.src;

				gsap.set(clonedMedia, {
					autoAlpha: 0,
					position: 'absolute',
					top: 0,
					left: 0,
					scale: 1.1,
					transformOrigin: 'center center',
					zIndex: 50
				});

				cloneElement.appendChild(clonedMedia);

				tl
					.to(currentMedia, {
						autoAlpha: 0,
						scale: 1.1,
						transformOrigin: 'center center'
					}, 'start')
					.to(clonedMedia, {
						autoAlpha: 1,
						x: 0,
						y: 0,
						xPercent: x,
						yPercent: y,
						scale,
						transformOrigin,
						objectFit,
						objectPosition,
						width: offsetWidth,
						height: offsetHeight
					}, 'start');
			} else {
				tl
					.to(currentMedia, {
						x: 0,
						y: 0,
						xPercent: x,
						yPercent: y,
						scale,
						transformOrigin,
						objectFit,
						objectPosition,
						width: offsetWidth,
						height: offsetHeight
					}, 'start');
			}

			tl.set(nextElement, {
				clearProps: 'opacity,visibility'
			})
		});
	}

	static killAll(data) {
		ScrollTrigger.getAll()
			.filter((instance) => instance.trigger && data.current.container && data.current.container.contains(instance.trigger))
			.forEach((instance) => {
				instance.kill(false, false);
				instance = null;
			});

		// ScrollTrigger.clearMatchMedia();
	}

	static updateAll(data) {
		ScrollTrigger.getAll()
			.filter((instance) => instance.trigger && data.current.container && data.current.container.contains(instance.trigger))
			.forEach((instance) => {
				instance.refresh(false);
			});
	}

	static _shouldInverseDirection(data, headerRef) {
		return data.trigger && data.trigger === 'back' && (!headerRef || (headerRef && !headerRef.instance.opened));
	}
}

class AJAXHelpers {
	static getTransitionDuration() {
		let result = 1.2; // default

		if (typeof app.options.ajax.transitionDuration === 'number') {
			return app.options.ajax.transitionDuration;
		}

		return result;
	}

	static getTransitionEase() {
		let result = 'expo.inOut'; // default

		if (typeof app.options.ajax.transitionEase === 'string') {
			return app.options.ajax.transitionEase;
		}

		return result;
	}

	static removeClonedElements() {
		return new Promise((resolve) => {
			const clones = [...document.querySelectorAll('.js-ajax-transition-clone')];

			if (clones.length) {
				const tl = gsap.timeline({
					onComplete: () => AJAXHelpers.resolveOnNextTick(resolve)
				});

				clones.forEach(clone => {
					// clone.remove();
					tl.to(clone, {
						autoAlpha: 1,
						duration: 0.2,
						// mixBlendMode: 'difference',
						onComplete: () => {
							clone.remove();
							// gsap.ticker.add(clone.remove.bind(clone), true, false);
						}
					}, 'start');
				});
			} else {
				AJAXHelpers.resolveOnNextTick(resolve);
			}
		})
	}

	static cleanContainers(data) {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => AJAXHelpers.resolveOnNextTick(resolve)
			});

			if (data.next.container) {
				tl.set(data.next.container, {
					clearProps: 'all'
				});
			}
		});
	}

	static cleanContent() {
		return new Promise((resolve) => {
			const tl = gsap.timeline({
				onComplete: () => AJAXHelpers.resolveOnNextTick(resolve)
			});

			if (app.contentEl) {
				tl.set(app.contentEl, {
					clearProps: 'all'
				});
			}
		});
	}

	static cleanBody() {
		return new Promise((resolve) => {
			gsap.set(document.body, {
				clearProps: 'backgroundColor,overflow',
				onComplete: AJAXHelpers.resolveOnNextTick(resolve)
			});
		});
	}

	static resolveOnNextTick(resolve, args = true) {
		gsap.ticker.add(() => resolve(args), true, false);
	}

	static resetScrollPosition(duration = 0) {
		return new Promise((resolve) => {
			app.utilities.scrollTo({
				target: 0,
				duration,
				cb: () => {
					ScrollTrigger.clearScrollMemory('manual');
					ScrollTrigger.refresh(false);
					AJAXHelpers.resolveOnNextTick(resolve);
				}
			});
		});
	}

	static dispatchEvent(name, options, target = document) {
		if (target) {
			const event = new CustomEvent(name, options);

			target.dispatchEvent(event);
		}
	}

	static sanitizeSelector(string) {
		if (!string || !string.length) {
			return false;
		}

		return string
			.replace(/(\r\n|\n|\r)/gm, '') // remove tabs, spaces
			.replace(/(\\n)/g, '') // remove lines breaks
			.replace(/^[,\s]+|[,\s]+$/g, '') // remove redundant commas
			.replace(/\s*,\s*/g, ','); // remove duplicated commas
	}
}

class AJAXLifecycle {
	static startTransition() {
		return new Promise((resolve) => {
			AJAXHelpers.dispatchEvent('arts/barba/transition/start');
			AJAXHelpers.resolveOnNextTick(resolve);
		});
	}

	static endTransition(data) {
		return new Promise((resolve) => {
			AJAXHelpers.cleanBody()
				.then(() => AJAXUpdater.autoPlayPausedVideos(data))
				.then(() => {
					AJAXHelpers.dispatchEvent('arts/barba/transition/end/before');

					AJAXHelpers.cleanContent()
						.then(() => AJAXHelpers.removeClonedElements())
						.then(() => {
							AJAXHelpers.dispatchEvent('arts/barba/transition/end');
							AJAXHelpers.resolveOnNextTick(resolve);
						});
				});
		});
	}

	static initNewPage(data) {
		return new Promise((resolve, reject) => {
			AJAXHelpers.dispatchEvent('arts/barba/transition/init/before');

			AJAXAnimations.killAll(data);

			AJAXUpdater.disposeComponents(data);

			data.current.content.innerHTML = '';

			app.containerEl = data.next.container;
			app.contentEl = data.next.content;

			AJAXHelpers.resetScrollPosition()
				.then(() => AJAXUpdater.syncNextPage(data))
				.then(() => AJAXUpdater.evalInlineScripts(data))
				.then(() => AJAXUpdater.autoPlayPausedVideos(data))
				.then(() => AJAXUpdater.updateComponents())
				.then(() => AJAXHelpers.cleanContainers(data))
				.then(() => {
					return new Promise((res) => {
						// Emit "DOMContentLoaded" ready event
						AJAXHelpers.dispatchEvent('DOMContentLoaded', {
							bubbles: true,
							cancelable: true
						});

						// Emit "load" event
						AJAXHelpers.dispatchEvent('load', {
							bubbles: true,
							cancelable: true
						}, window);

						AJAXHelpers.dispatchEvent('arts/barba/transition/init/after');

						AJAXHelpers.resolveOnNextTick(res);
					});
				})
				.then(() => AJAXHelpers.resolveOnNextTick(resolve))
				.catch((e) => reject(e));
		}).catch((e) => { // fallback hard refresh if transition failed
			console.warn(e);
			barba.force(data.next.url.href);
		});
	}

	static initNewPageFlyingImageBefore(data) {
		return new Promise((resolve, reject) => {
			app.containerEl = data.next.container;
			app.contentEl = data.next.content;

			AJAXUpdater.syncNextPage(data)
				.then(() => AJAXUpdater.evalInlineScripts(data))
				.then(() => AJAXUpdater.autoPlayPausedVideos(data))
				.then(() => AJAXUpdater.updateComponents())
				.then(() => AJAXHelpers.cleanContainers(data))
				.then(() => {
					AJAXHelpers.dispatchEvent('arts/barba/transition/init/before');

					// ScrollTrigger.clearScrollMemory();
					AJAXAnimations.updateAll(data);

					AJAXHelpers.resolveOnNextTick(resolve);
				})
				.catch((e) => reject(e));
		}).catch((e) => { // fallback hard refresh if transition failed
			console.warn(e);
			barba.force(data.next.url.href);
		});
	}

	static initNewPageFlyingImageAfter(data) {
		return new Promise((resolve) => {
			AJAXAnimations.killAll(data);

			AJAXUpdater.disposeComponents(data);

			if (data.current.container) {
				data.current.content.innerHTML = '';
			}

			AJAXHelpers.cleanContainers(data).then(() => {
				// Emit "DOMContentLoaded" ready event
				AJAXHelpers.dispatchEvent('DOMContentLoaded', {
					bubbles: true,
					cancelable: true
				});

				// Emit "load" event
				AJAXHelpers.dispatchEvent('load', {
					bubbles: true,
					cancelable: true
				}, window);

				AJAXHelpers.dispatchEvent('arts/barba/transition/init/after');

				AJAXHelpers.resolveOnNextTick(resolve);
			});
		});
	}

	static buildContainersDOM(data) {
		return new Promise((resolve, reject) => {
			const parser = new DOMParser();

			const parseCurrentContainerTask = scheduler.postTask(() => {
				data.current.DOM = parser.parseFromString(data.current.html, 'text/html');
			});

			const parseNextContainerTask = scheduler.postTask(() => {
				data.next.DOM = parser.parseFromString(data.next.html, 'text/html');
			});

			Promise.all([
				parseCurrentContainerTask,
				parseNextContainerTask
			]).finally(() => {
				if (data.next.DOM && data.next.container) {
					data.current.content = data.current.container.querySelector('#page-wrapper__content');
					data.next.content = data.next.container.querySelector('#page-wrapper__content');

					AJAXHelpers.dispatchEvent('arts/barba/transition/dom');

					if (!!app.lazy && typeof app.lazy.update === 'function') {
						app.lazy.update();
					}

					app.injectPreloadTags({ container: data.next.content }).then(() => resolve(true), () => resolve(true));
				} else {
					reject(`Next page container not found.`);
				}
			});
		}).catch((e) => {
			console.warn(e);
			barba.force(data.next.url.href);
		});
	}

	static loadOnlyFirstComponent(data) {
		return new Promise((resolve) => {
			Promise.all(app.componentsManager.init({
				scope: data.next.container,
				loadOnlyFirst: true
			})).then(() => resolve(true))
		});
	}

	static loadRestComponents(data) {
		return new Promise((resolve) => {
			Promise.all(app.componentsManager.init({
				scope: data.next.container
			})).then(() => resolve(true));
		});
	}
}

class AJAXSeamless {
	static getCurrentMediaElements(data) {
		const result = {
			currentElement: null,
			currentElementMedia: null
		},
			postIDElement = data.trigger.closest('[data-post-id]'),
			postID = postIDElement ? postIDElement.getAttribute('data-post-id') : null;

		let currentElement = data.trigger.querySelector('.js-ajax-transition-element');

		// Look up transition elements
		// inside the clicked link element
		if (!currentElement) {
			const outerWrapper = data.trigger.closest('[data-post-id]');

			if (outerWrapper) {
				currentElement = outerWrapper.querySelector('.js-ajax-transition-element');
			}
		}

		// Look up sibling transition elements
		// of the same post id
		if (!currentElement && postID) {
			const outerContainer = data.trigger.closest('[data-ajax-transition]');
			if (outerContainer) {
				const siblings = [...outerContainer.querySelectorAll(`[data-post-id="${postID}"]`)];

				if (siblings.length) {
					siblings.forEach((el) => {
						// Self is the transition element
						if (el.classList.contains('js-ajax-transition-element')) {
							currentElement = el;
						} else {
							// Look up inner transition element
							const siblingImage = el.querySelector('.js-ajax-transition-element');

							if (siblingImage) {
								currentElement = siblingImage;
							}
						}
					});
				}
			}
		}

		if (currentElement) {
			result.currentElement = currentElement;

			const videoMediaElement = currentElement.querySelector('video.js-ajax-transition-element__media');

			if (videoMediaElement) {
				result.currentElementMedia = videoMediaElement;
			} else {
				const imageMediaElement = currentElement.querySelector('img.js-ajax-transition-element__media');

				if (imageMediaElement) {
					result.currentElementMedia = imageMediaElement;
				}
			}
		}
		return result;
	}

	static getNextMediaElements(data) {
		const result = {
			nextElement: null,
			nextElementMedia: null
		};

		const nextElement = data.next.container.querySelector('.masthead .js-ajax-transition-element');

		if (nextElement) {
			result.nextElement = nextElement;

			const videoMediaElement = nextElement.querySelector('video.js-ajax-transition-element__media');

			if (videoMediaElement) {
				result.nextElementMedia = videoMediaElement;
			} else {
				const imageMediaElement = nextElement.querySelector('img.js-ajax-transition-element__media');

				if (imageMediaElement) {
					result.nextElementMedia = imageMediaElement;
				}
			}
		}

		return result;
	}

	static getWebGLTransitionContainer(data) {
		const outerContainer = data.trigger.closest('.has-curtains');

		if (outerContainer) {
			return outerContainer.querySelector('.canvas-wrapper');
		}

		return null;
	}

	static loadWebGLPlane(data, { canvas, nextElement, nextElementMedia } = {}) {
		return new Promise((resolve) => {
			if (canvas instanceof HTMLElement) {
				const event = new CustomEvent('loadPlane', {
					detail: {
						trigger: data.trigger,
						nextElement,
						nextElementMedia,
						callback: () => AJAXHelpers.resolveOnNextTick(resolve)
					}
				});

				canvas.dispatchEvent(event);
			} else {
				AJAXHelpers.resolveOnNextTick(resolve);
			}
		});
	}

	static translateWebGLPlane(data, { duration, ease, offsetTop, canvas, nextElement, nextElementMedia } = {}) {
		return new Promise((resolve) => {
			if (canvas instanceof HTMLElement) {
				const nextOverlayEl = nextElement.querySelector('.js-ajax-transition-element__overlay');

				gsap.set(nextElement, {
					autoAlpha: 0
				});

				// if (nextOverlayEl) {
				// 	const
				// 		cloneOverlay = nextOverlayEl.cloneNode(true),
				// 		opacity = gsap.getProperty(nextOverlayEl, 'opacity');

				// 	gsap.set(cloneOverlay, {
				// 		autoAlpha: 0
				// 	});

				// 	canvas.appendChild(cloneOverlay);

				// 	gsap.to(cloneOverlay, {
				// 		duration,
				// 		ease,
				// 		autoAlpha: opacity
				// 	});
				// }

				const event = new CustomEvent('translatePlane', {
					detail: {
						duration,
						ease,
						offsetTop: typeof offsetTop === 'function' ? offsetTop() : offsetTop,
						trigger: data.trigger,
						nextElement,
						nextElementMedia,
						callback: () => {
							gsap.set(nextElement, {
								clearProps: 'opacity,visibility'
							});

							AJAXHelpers.resetScrollPosition()
								.then(() => AJAXHelpers.resolveOnNextTick(resolve));
						}
					}
				});

				canvas.dispatchEvent(event);
			} else {
				AJAXHelpers.resolveOnNextTick(resolve);
			}
		});
	}

	static setCanvas(canvas) {
		return new Promise((resolve) => {
			if (canvas instanceof HTMLElement) {
				canvas.style.position = 'fixed';
				canvas.style.zIndex = 200;
				canvas.style.transform = '';
				canvas.classList.add('js-ajax-transition-clone');

				document.body.appendChild(canvas);

				AJAXHelpers.resolveOnNextTick(resolve);
			} else {
				AJAXHelpers.resolveOnNextTick(resolve);
			}
		});
	}

	static cloneMedia({ currentElement, nextElement, target = document.body, position = 'fixed' } = { target: document.body, position: 'fixed' }) {
		return new Promise((resolve) => {
			if (!currentElement || !nextElement) {
				resolve({
					cloneElement: null,
					nextElement
				});
				return;
			}

			const {
				top,
				left,
				width,
				height
			} = currentElement.getBoundingClientRect(),
				tl = gsap.timeline(),
				cloneElement = currentElement.cloneNode(true),
				mediaElement = currentElement.querySelector('.js-ajax-transition-element__media'),
				objectFit = gsap.getProperty(mediaElement, 'objectFit'),
				objectPosition = gsap.getProperty(mediaElement, 'objectPosition'),
				mediaWidth = mediaElement.offsetWidth,
				mediaHeight = mediaElement.offsetHeight,
				videoEl = currentElement.querySelector('video'),
				nextOverlayEl = nextElement.querySelector('.js-ajax-transition-element__overlay');

			[cloneElement, mediaElement].forEach((el) => {
				if (el) {
					// el.removeAttribute('class');
					el.classList.remove(
						'w-100',
						'h-100',
						'full-width',
						'full-height',
						'auto-width-height',
						'w-auto',
						'h-auto'
					);
				}
			});

			cloneElement.classList.add('js-ajax-transition-clone');
			mediaElement.classList.add('js-ajax-transition-element__media');

			const hiddenTransitionElements = [...cloneElement.querySelectorAll('.js-ajax-transition-hidden-element')];

			if (hiddenTransitionElements.length) {
				gsap.set(hiddenTransitionElements, {
					autoAlpha: 0,
					overwrite: true
				});
			}

			// if (nextOverlayEl) {
			// 	const cloneOverlay = nextOverlayEl.cloneNode(true);

			// 	tl.set(cloneOverlay, {
			// 		autoAlpha: 0
			// 	});

			// 	cloneElement.appendChild(cloneOverlay);
			// }

			tl.set(cloneElement, {
				margin: 0,
				padding: 0,
				zIndex: 400,
				maxWidth: 'unset',
				maxHeight: 'unset',
				position,
				transform: 'none',
				overflow: 'hidden',
				top,
				left,
				width,
				height,
				opacity: 0,
			});

			tl.set(mediaElement, {
				objectFit,
				objectPosition,
				width: mediaWidth,
				height: mediaHeight
			});

			if (videoEl) {
				const
					cloneVideoEl = cloneElement.querySelector('video'),
					nextVideoEl = nextElement.querySelector('video');

				cloneVideoEl.currentTime = videoEl.currentTime;

				if (nextVideoEl) {
					nextVideoEl.currentTime = cloneVideoEl.currentTime;
				}

				target.appendChild(cloneElement);

				tl.to(cloneElement, {
					duration: 0.2,
					opacity: 1,
					onComplete: () => {
						Promise.all([
							cloneVideoEl.play(),
							nextVideoEl.play()
						])
							.then(() => AJAXHelpers.resolveOnNextTick(resolve, { cloneElement, nextElement }))
							.catch(() => AJAXHelpers.resolveOnNextTick(resolve, { cloneElement, nextElement }));
					}
				});
			} else {
				target.appendChild(cloneElement);

				tl.to(cloneElement, {
					duration: 0.25,
					opacity: 1,
					onComplete: () => {
						AJAXHelpers.resolveOnNextTick(resolve, { cloneElement, nextElement });
					}
				});
			}
		});
	}
}

const AJAXTransitionAutoScrollNext = {
	name: 'autoScrollNext',

	custom: (data) => {
		if (data && data.trigger instanceof HTMLElement) {
			const el = data.trigger.closest('[data-ajax-transition]');

			return el && el.getAttribute('data-ajax-transition') === AJAXTransitionAutoScrollNext.name;
		} else {
			return false;
		}
	},

	before: (data) => {
		return AJAXLifecycle.startTransition(data);
	},

	beforeEnter: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.buildContainersDOM(data)
				.then(() => AJAXLifecycle.loadOnlyFirstComponent(data))
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	},

	enter: (data) => {
		return AJAXLifecycle.initNewPageFlyingImageBefore(data);
	},

	afterEnter: (data) => {
		return new Promise((resolve) => {
			let
				duration = AJAXHelpers.getTransitionDuration(),
				ease = AJAXHelpers.getTransitionEase(),
				{ nextElement, nextElementMedia } = AJAXSeamless.getNextMediaElements(data);

			if (nextElement && nextElementMedia) {
				const canvas = AJAXSeamless.getWebGLTransitionContainer(data);
				const AJAXRef = app.componentsManager.getComponentByName('AJAX');

				AJAXRef.runningSeamlessTransition = true;

				// WebGL -> Image transition
				if (canvas) {
					AJAXSeamless.setCanvas(canvas)
						.then(() => AJAXAnimations.hideContent(data))
						.then(() => AJAXHelpers.resetScrollPosition())
						.then(() => AJAXSeamless.loadWebGLPlane(data, {
							canvas,
							nextElement,
							nextElementMedia
						}))
						.then(() => Promise.all([
							AJAXSeamless.translateWebGLPlane(data, {
								duration,
								ease,
								canvas,
								nextElement,
								nextElementMedia
							}),
							AJAXAnimations.animateContainers(data, {
								duration,
								ease
							})
						]))
						.then(() => AJAXHelpers.resolveOnNextTick(resolve));
				} else { // Image -> Image transition
					const currentElement = data.trigger.closest('[data-post-id]').querySelector('.js-ajax-transition-element');

					AJAXSeamless.cloneMedia({ currentElement, nextElement })
						.then(({ cloneElement, nextElement }) => {
							if (cloneElement && nextElement) {
								AJAXAnimations.hideContent(data)
									.then(() => AJAXHelpers.resetScrollPosition())
									.then(() => Promise.all([
										AJAXAnimations.animateMedia({
											duration,
											ease,
											cloneElement,
											nextElement
										}),
										AJAXAnimations.animateContainers(data, { duration, ease })
									]))
									.then(() => AJAXHelpers.resolveOnNextTick(resolve));
							} else {
								AJAXAnimations.animateCurtains(data, { duration, ease })
									.then(() => AJAXHelpers.resetScrollPosition())
									.then(() => AJAXHelpers.resolveOnNextTick(resolve));
							}
						});
				}
			} else { // No target media
				AJAXAnimations.hideContent(data)
					.then(() => AJAXHelpers.resetScrollPosition())
					.then(() => AJAXAnimations.animateCurtains(data, { duration, ease }))
					.then(() => AJAXHelpers.resolveOnNextTick(resolve));
			}
		});
	},

	after: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.initNewPageFlyingImageAfter(data)
				.then(() => AJAXLifecycle.loadRestComponents(data))
				.then(() => AJAXLifecycle.endTransition(data))
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	}
}

const AJAXTransitionFlyingImage = {
	name: 'flyingImage',

	custom: (data) => {
		if (data && data.trigger instanceof HTMLElement) {
			const el = data.trigger.closest('[data-ajax-transition]');

			return el && el.getAttribute('data-ajax-transition') === AJAXTransitionFlyingImage.name;
		} else {
			return false;
		}
	},

	before: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.startTransition(data)
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	},

	beforeEnter: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.buildContainersDOM(data)
				.then(() => AJAXLifecycle.loadOnlyFirstComponent(data))
				.then(() => {
					AJAXHelpers.resolveOnNextTick(resolve)
				});
		});
	},

	enter: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.initNewPageFlyingImageBefore(data)
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	},

	afterEnter: (data) => {
		return new Promise((resolve) => {
			let
				duration = AJAXHelpers.getTransitionDuration(),
				ease = AJAXHelpers.getTransitionEase(),
				{ nextElement, nextElementMedia } = AJAXSeamless.getNextMediaElements(data);

			if (nextElement && nextElementMedia) {
				const canvas = AJAXSeamless.getWebGLTransitionContainer(data);
				const AJAXRef = app.componentsManager.getComponentByName('AJAX');

				AJAXRef.runningSeamlessTransition = true;

				// WebGL -> Image transition
				if (canvas) {
					const
						container = canvas.closest('.has-curtains') || canvas,
						translateY = gsap.getProperty(canvas, 'y', 'px'),
						translateYParsed = typeof translateY === 'string' ? parseFloat(translateY) : 0,
						rect = container.getBoundingClientRect(),
						scrollY = window.scrollY;
					// Scroll to canvas view first
					if (parseInt(scrollY) !== parseInt(rect.top)) {
						app.utilities.scrollLock(false);

						app.utilities.scrollTo({
							target: container,
							duration: 0.6,
							offset: -translateYParsed,
							cb: () => {
								AJAXSeamless.setCanvas(canvas)
								.then(() => AJAXAnimations.hideContent(data))
								.then(() => AJAXSeamless.loadWebGLPlane(data, {
									canvas,
									nextElement,
									nextElementMedia
								}))
								.then((e) => Promise.all([
									// app.utilities.scrollLock(true),
	
									AJAXSeamless.translateWebGLPlane(data, {
										duration,
										ease,
										offsetTop: scrollY + rect.top,
										canvas,
										nextElement,
										nextElementMedia
									}),
									AJAXAnimations.animateContainers(data, {
										duration,
										ease
									})
								]))
								.then(() => AJAXHelpers.resetScrollPosition())
								.then(() => AJAXHelpers.resolveOnNextTick(resolve));
							}
						})
					} else {
						AJAXSeamless.setCanvas(canvas)
							.then(() => AJAXAnimations.hideContent(data))
							.then(() => AJAXHelpers.resetScrollPosition())
							.then(() => AJAXSeamless.loadWebGLPlane(data, {
								canvas,
								nextElement,
								nextElementMedia
							}))
							.then((e) => Promise.all([
								AJAXSeamless.translateWebGLPlane(data, {
									duration,
									ease,
									offsetTop: scrollY + rect.top,
									canvas,
									nextElement,
									nextElementMedia
								}),
								AJAXAnimations.animateContainers(data, {
									duration,
									ease
								})
							]))
							.then(() => AJAXHelpers.resolveOnNextTick(resolve));
					}
				} else { // Image -> Image transition
					const { currentElement } = AJAXSeamless.getCurrentMediaElements(data);

					AJAXSeamless.cloneMedia({ currentElement, nextElement })
						.then(({ cloneElement, nextElement }) => {
							if (cloneElement && nextElement) {
								AJAXAnimations.hideContent(data)
									.then(() => AJAXHelpers.resetScrollPosition())
									.then(() => Promise.all([
										AJAXAnimations.animateMedia({
											duration,
											ease,
											cloneElement,
											nextElement
										}),
										AJAXAnimations.animateContainers(data, { duration, ease })
									]))
									.then(() => AJAXHelpers.resolveOnNextTick(resolve));
							} else {
								AJAXAnimations.animateCurtains(data, { duration, ease })
									.then(() => AJAXHelpers.resetScrollPosition())
									.then(() => AJAXHelpers.resolveOnNextTick(resolve));
							}
						});

				}
			} else { // No target media
				AJAXAnimations.hideContent(data)
					.then(() => AJAXHelpers.resetScrollPosition())
					.then(() => AJAXAnimations.animateCurtains(data, { duration, ease }))
					.then(() => AJAXHelpers.resolveOnNextTick(resolve));
			}
		});
	},

	after: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.initNewPageFlyingImageAfter(data)
				.then(() => AJAXLifecycle.loadRestComponents(data))
				.then(() => AJAXLifecycle.endTransition(data))
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	}
}

const AJAXTransitionGeneral = {
	name: 'general',

	before: (data) => {
		return AJAXLifecycle.startTransition(data);
	},

	beforeEnter: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.buildContainersDOM(data)
				.then(() => AJAXLifecycle.loadOnlyFirstComponent(data))
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	},

	enter: (data) => {
		return new Promise((resolve) => {
			let
				duration = AJAXHelpers.getTransitionDuration(),
				ease = AJAXHelpers.getTransitionEase();
			AJAXAnimations.animateCurtains(data, { duration, ease })
				.then(() => {
					AJAXHelpers.resolveOnNextTick(resolve);
				});
		});
	},

	afterEnter: (data) => {
		return new Promise((resolve) => {
			AJAXLifecycle.initNewPage(data)
				.then(() => AJAXLifecycle.loadRestComponents(data))
				.then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	},

	after: (data) => {
		return AJAXLifecycle.endTransition(data);
	}
};

class AJAXUpdater {
	static syncNextPage(data) {
		return new Promise((resolve, reject) => {
			Promise.all([
				AJAXUpdater._updateNodesAttributes(data),
				AJAXUpdater._updateBody(data),
				AJAXUpdater._updateHeadTags(data),
				AJAXUpdater._updateHeadStyles(data),
				AJAXUpdater._updateScripts(data),
				AJAXUpdater._updateTrackerGA(),
				AJAXUpdater._updateTrackerFBPixel(),
				AJAXUpdater._updateTrackerYaMetrika(),
				AJAXUpdater._updateCloudFlareEmailProtection()
			])
				.then(document.fonts.ready)
				.then(() => AJAXHelpers.resolveOnNextTick(resolve))
				.catch((e) => reject(e));
		});
	}

	/**
	 * Eval inline scripts in the new container
	 */
	static evalInlineScripts(data) {
		return new Promise((resolve) => {
			if (!!app.options.ajax.evalInlineContainerScripts) {
				AJAXUpdater._evalInlineScripts(data.next.container)
					.finally(() => resolve(true));
			} else {
				resolve(true);
			}
		});
	}

	static _evalInlineScripts(container) {
		return new Promise((resolve) => {
			if (!container) {
				resolve(true);
				return;
			}

			const
				readyPromises = [],
				excludeTypes = [
					'application/ld+json',
					'application/json'
				],
				scripts = [...container.querySelectorAll('script')].filter((script) => {
					const type = script.getAttribute('type');

					return !type || (type && !excludeTypes.includes(type));
				});

			if (scripts.length) {
				scripts.forEach((script) => {
					const task = scheduler.postTask(() => {
						try {
							window.eval(script.textContent);
						} catch (error) {
							console.warn(error);
						}
					});

					readyPromises.push(task);
				});
			}

			Promise.all(readyPromises)
				.finally(() => {
					resolve(true);
				});
		});
	}

	static autoPlayPausedVideos(data) {
		return new Promise((resolve) => {
			const
				videos = [...data.next.container.querySelectorAll('video[muted][autoplay]')],
				promises = [];

			if (videos.length) {
				videos.forEach((el) => {
					if (el.paused && typeof el.play === 'function') {
						const playPromise = el.play();

						if (playPromise !== undefined) {
							playPromise.then(() => {
								promises.push(playPromise);
							}).catch(() => {
								promises.push(playPromise);
							});
						}
					}
				});
			}

			Promise.all(promises).then(() => AJAXHelpers.resolveOnNextTick(resolve));
		});
	}

	static updateComponents() {
		return new Promise((resolve) => {
			// Update persistent components
			app.componentsManager.instances.persistent.forEach((instance) => {
				if (instance && typeof instance.update === 'function') {
					instance.update();
				}
			});

			AJAXHelpers.resolveOnNextTick(resolve);
		});
	}

	static disposeComponents(data) {
		return new Promise((resolve) => {

			// Destroy disposable components
			app.componentsManager.instances.disposable.forEach((instance, index) => {
				if (data.current.container.contains(instance.element)) {
					AJAXUpdater.destroyInnerComponents(instance);

					if (instance && typeof instance.destroy === 'function') {
						instance.destroy();
					}

					app.componentsManager.instances.disposable[index] = null;
					delete app.componentsManager.instances.disposable[index];
				}
			});

			// Make disposable instances eligble for garbage collection
			app.componentsManager.instances.disposable = app.componentsManager.instances.disposable.filter(element => element !== null);

			AJAXHelpers.resolveOnNextTick(resolve);
		});
	}

	static destroyInnerComponents(instance) {
		if (instance.components.length) {
			instance.components.forEach((innerComponent) => {
				AJAXUpdater.destroyInnerComponents(innerComponent);
			});
		} else {
			if (typeof instance.destroy === 'function') {
				instance.destroy();
			}
		}
	}

	static _updateNodesAttributes(data) {
		return new Promise((resolve) => {
			const
				defaultNodesToUpdate = [
					'body',
					'#page-header',
					'#page-header .header__bar',
					'#page-header .menu-classic li',
					'#page-header .menu-overlay li',
					'#page-header .header__wrapper-overlay-menu'
				],
				nodesToUpdate = [...new Set([
					...defaultNodesToUpdate,
					...app.options.ajax.updateNodesAttributes.split(',')
				])]
					.map(selector => selector.trim())
					.filter(selector => selector.length > 0);

			nodesToUpdate.forEach((selector) => {
				let
					currentItems = [...document.querySelectorAll(selector)],
					nextItems = [...data.next.DOM.querySelectorAll(selector)];

				// different type of menu (overlay) found on the next page
				if (selector === '#page-header .menu-classic li' && !nextItems.length) {
					nextItems = [...data.next.DOM.querySelectorAll('#page-header .menu-overlay li')];
				}

				// different type of menu (classic) found on the next page
				if (selector === '#page-header .menu-overlay li' && !nextItems.length) {
					nextItems = [...data.next.DOM.querySelectorAll('#page-header .menu-classic li')];
				}

				// save menu position classes
				if (selector === '#page-header' && currentItems[0] && nextItems[0]) {
					const savedHeaderClassNames = [
						'header_classic-menu-left',
						'header_classic-menu-split-center',
						'header_classic-menu-center',
						'header_classic-menu-right',
						'header_overlay-logo-center-burger-right',
						'header_overlay-logo-left-burger-right',
						'header_overlay-logo-center-burger-left',
					];

					savedHeaderClassNames.forEach((className) => {
						if (currentItems[0].classList.contains(className)) {
							nextItems[0].classList.add(className);
						}
					});
				}

				if (nextItems.length) {
					AJAXUpdater._syncAttributes(currentItems, nextItems);
				}
			});

			resolve(true);
		});
	}

	static _updateBody(data) {
		return new Promise((resolve, reject) => {
			if (data.next.DOM.body && data.next.DOM.body.classList.contains('page-no-ajax')) {
				reject('Transition has been interrupted: Destination page requested a hard refresh.');
			} else {
				AJAXHelpers.resolveOnNextTick(resolve);
			}
		});
	}

	/**
	 * Update <head> tags
	 */
	static _updateHeadTags(data) {
		return new Promise((resolve, reject) => {
			let
				tagstoUpdate = [
					'meta[name="keywords"]',
					'meta[name="description"]',
					'meta[property^="og"]',
					'meta[name^="twitter"]',
					'meta[itemprop]',
					'link[itemprop]',
					'link[rel="prev"]',
					'link[rel="next"]',
					'link[rel="canonical"]',
					'link[rel="alternate"]',
					'link[rel="shortlink"]',
				];

			tagstoUpdate.forEach((selector) => {
				const
					currentElement = document.head.querySelector(selector),
					nextElement = data.next.DOM.head.querySelector(selector);

				if (currentElement && nextElement) { // both tags exist, update (replace) them with the new ones
					currentElement.replaceWith(nextElement);
				} else if (currentElement && !nextElement) { // tag doesn't exist on the next page, remove it
					currentElement.remove();
				} else if (!currentElement && nextElement) { // tag doesn't exist on the current page but it exists on the next page
					document.head.append(nextElement);
				}
			});

			AJAXHelpers.resolveOnNextTick(resolve);
		});
	}

	/**
	 * Load styles for new page
	 * Update inline styles in <head>
	 */
	static _updateHeadStyles(data) {
		let
			promises = [],
			stylesToUpdate = [
				'link[rel="stylesheet"][id]',
				'style[id]'
			],
			currentStyles = [...document.head.querySelectorAll(stylesToUpdate.join(', '))],
			nextStyles = [...data.next.DOM.querySelectorAll(stylesToUpdate.join(', '))];

		// Load & update <head> styles
		nextStyles.forEach((el) => {
			Promise.all(promises).then(() => {
				const
					currentElement = document.head.querySelector(`#${el.id}`),
					currentHref = currentElement ? currentElement.getAttribute('href') : null,
					nextHref = el.getAttribute('href'),
					refElement = currentElement ? [...document.head.children].filter((el) => el.isEqualNode(currentElement.previousElementSibling))[0] : currentElement;

				let isInlineStyle = false;

				if (el.innerHTML.length) {
					isInlineStyle = true;
				}

				// handle inline style
				if (isInlineStyle) {
					// inline style already exists so simply update it
					if (currentElement) {
						currentElement.textContent = el.textContent.trim();
					} else { // create new inline script element
						promises.push(app.assetsManager.load({
							type: 'style',
							id: el.id,
							inline: el.textContent,
							preload: false,
							refElement
						}));
					}

				} else { // handle style with [href] attribute

					// load style that's not present on the current page
					// or if it exists but has different href
					if (!currentElement || currentHref !== nextHref) {
						promises.push(app.assetsManager.load({
							type: 'style',
							id: el.id,
							src: nextHref,
							preload: false,
							refElement,
							cache: !(currentElement && currentElement.id === el.id) // duplicate ID element
						}));
					}
				}
			});
		});

		if (!!app.options.ajax.removeMissingStyles) {
			return new Promise((resolve) => {
				Promise.all(promises).then(() => {
					currentStyles.forEach((el) => {
						const nextElement = data.next.DOM.querySelector(`#${el.id}`);

						// Next style doesn't exist in current <head>
						// so remove it
						if (!nextElement) {
							el.remove();

							delete app.assetsManager.promises[el.id];
						}
					});

					AJAXHelpers.resolveOnNextTick(resolve);
				})
			});
		} else {
			return Promise.all(promises);
		}
	}

	static _updateScripts(data) {
		return new Promise((resolve) => {
			const
				promises = [],
				customNodes = AJAXHelpers.sanitizeSelector(app.options.ajax.updateScriptNodes) || [],
				nextScripts = [...data.next.DOM.querySelectorAll('script[id], script[src*="maps.googleapis.com/maps/api"]')];

			nextScripts.forEach((el) => {
				const
					currentElement = el.id ? document.body.querySelector(`#${el.id}`) : undefined;

				let isInlineScript = false;

				if (el.textContent.length) {
					isInlineScript = true;
				}

				// handle inline script
				if (isInlineScript) {
					// inline script with same ID already exists
					if (currentElement) {

						// update its contents only if it differs from the current script
						// don't update theme internal scripts
						if (currentElement.textContent !== el.textContent && !el.id.includes('asli')) {
							currentElement.textContent = el.textContent.trim();

							try {
								window.eval(currentElement.textContent);
							} catch (error) {
								console.warn(error);
							}
						}
					} else { // create new inline script element
						promises.push(app.assetsManager.load({
							type: 'script',
							id: el.id,
							inline: el.textContent.trim(),
							preload: false,
							// refElement
						}));
					}
				} else { // handle script with [src] attribute

					// load script that's not present on the current page
					if (!currentElement) {
						promises.push(app.assetsManager.load({
							type: 'script',
							id: el.id,
							src: el.src,
							preload: false
						}));
					} else if (customNodes.includes(el.id)) {

						// remove current script
						currentElement.remove();

						// re-load script ignoring cache
						promises.push(app.assetsManager.load({
							type: 'script',
							id: el.id,
							src: el.src,
							preload: false,
							cache: false
						}));
					}
				}
			});

			return Promise.all(promises).then(
				() => AJAXHelpers.resolveOnNextTick(resolve),
				() => AJAXHelpers.resolveOnNextTick(resolve)
			);
		});
	}

	static _syncAttributes(targetElements, sourceElements) {
		return new Promise((resolve) => {

			if (targetElements.length > 0 && sourceElements.length > 0 && targetElements.length === sourceElements.length) {
				targetElements.forEach((element, index) => {
					const
						targetAttributes = [...element.attributes].filter((attr) => attr.name !== 'style'),
						sourceAttributes = [...sourceElements[index].attributes].filter((attr) => attr.name !== 'style');

					if (sourceAttributes.length) {
						// remove attributes that are not present in source element
						targetAttributes.forEach((attr) => {
							if (!(attr.nodeName in sourceElements[index].attributes)) {
								element.removeAttribute(attr.nodeName);
							}
						});

						// sync attributes
						sourceAttributes.forEach((attr) => {
							if (attr.nodeName in sourceElements[index].attributes) {
								element.setAttribute(attr.nodeName, sourceElements[index].attributes[attr.nodeName].nodeValue);
							} else {
								element.removeAttribute(attr.nodeName);
							}
						});
					} else { // source element doesn't have any attributes present
						// ... so remove all attributes from the target element
						targetAttributes.forEach((attr) => element.removeAttribute(attr.name));
					}
				});
			}

			AJAXHelpers.resolveOnNextTick(resolve);
		});
	}

	static _updateTrackerGA() {
		return new Promise((resolve) => {
			if (typeof window.gtag === 'function' && typeof window.gaData === 'object' && Object.keys(window.gaData)[0] !== 'undefined') {
				const
					trackingID = Object.keys(window.gaData)[0],
					pageRelativePath = (window.location.href).replace(window.location.origin, '');

				gtag('js', new Date());
				gtag('config', trackingID, {
					'page_title': document.title,
					'page_path': pageRelativePath
				});
			}

			resolve(true);
		});
	}

	static _updateTrackerFBPixel() {
		return new Promise((resolve) => {
			if (typeof window.fbq === 'function') {
				fbq('track', 'PageView');
			}

			resolve(true);
		});
	}

	static _updateTrackerYaMetrika() {
		return new Promise((resolve) => {
			if (typeof window.ym === 'function') {
				function getYmTrackingNumber() {
					if (typeof window.Ya !== 'undefined' && typeof window.Ya.Metrika2) {
						return window.Ya.Metrika2.counters()[0].id || null;
					}

					if (typeof window.Ya !== 'undefined' && typeof window.Ya.Metrika) {
						return window.Ya.Metrika.counters()[0].id || null;
					}

					return null;
				}

				const trackingID = getYmTrackingNumber();

				ym(trackingID, 'hit', window.location.href, {
					title: document.title
				});
			}

			resolve(true);
		});
	}

	static _updateCloudFlareEmailProtection() {
		return new Promise((resolve) => {
			var HEADER = "/cdn-cgi/l/email-protection#",
				SPECIAL_SELECTOR = ".__cf_email__",
				SPECIAL_ATTRIBUTE = "data-cfemail",
				DIV = document.createElement("div");

			function error(e) {
				try {
					if ("undefined" == typeof console) return;
					"error" in console ? console.error(e) : console.log(e)
				} catch (e) { }
			}

			function sanitize(e) {
				DIV.innerHTML = '<a href="' + e.replace(/"/g, "&quot;") + '"></a>';
				return DIV.childNodes[0].getAttribute("href") || ""
			}

			function nextHex(hexstr, skip) {
				return parseInt(hexstr.substr(skip, 2), 16)
			}

			function decrypt(ciphertext, skip) {
				for (var out = "", magic = nextHex(ciphertext, skip), i = skip + 2; i < ciphertext.length; i += 2) {
					var hex = nextHex(ciphertext, i) ^ magic;
					out += String.fromCharCode(hex)
				}
				try {
					out = decodeURIComponent(escape(out))
				} catch (err) {
					error(err)
				}
				return sanitize(out)
			}

			function decryptLinks(doc) {
				for (var links = doc.querySelectorAll("a"), c = 0; c < links.length; c++) try {
					var currentLink = links[c];
					var a = currentLink.href.indexOf(HEADER);
					a > -1 && (currentLink.href = "mailto:" + decrypt(currentLink.href, a + HEADER.length))
				} catch (err) {
					error(err)
				}
			}

			function decryptOthers(doc) {
				for (var specials = doc.querySelectorAll(SPECIAL_SELECTOR), c = 0; c < specials.length; c++) try {
					var current = specials[c],
						parent = current.parentNode,
						ciphertext = current.getAttribute(SPECIAL_ATTRIBUTE);
					if (ciphertext) {
						var email = decrypt(ciphertext, 0),
							tmpDOM = document.createTextNode(email);
						parent.replaceChild(tmpDOM, current)
					}
				} catch (err) {
					error(err)
				}
			}

			function decryptTemplates(doc) {
				for (var templates = doc.querySelectorAll("template"), n = 0; n < templates.length; n++) try {
					init(templates[n].content)
				} catch (err) {
					error(err)
				}
			}

			function init(doc) {
				try {
					decryptLinks(doc);
					decryptOthers(doc);
					decryptTemplates(doc);
				} catch (err) {
					error(err)
				}
			}

			init(document);

			(function () {
				var e = document.currentScript || document.scripts[document.scripts.length - 1];
				e.parentNode.removeChild(e);

				resolve(true);
			})();
		});
	}
}

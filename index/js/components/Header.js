export default class Header extends BaseComponent {
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
			// External options from app.options.header
			defaults: options,
			// Component inner elements
			innerElements: {
				bar: '.js-header__bar',
				overlayContainer: '.js-header__overlay-container',
				overlayContainerInner: '.js-header__overlay-container-inner',
				overlaySwitcher: '.js-header__overlay-switcher',
				topLevelMenu: '.menu-overlay',
				allSubMenus: '.menu-overlay .sub-menu',
				submenuBackButton: '.js-header__overlay-submenu-back',
				submenuLabelCurrent: '.js-header__overlay-label-opened-current',
				submenuLabelNext: '.js-header__overlay-label-opened-next',
				widgets: '.js-header__overlay-widget'
			}
		});

		this._handlers = {
			mqChange: this._onMQChange.bind(this),
			transitionStart: this._onTransitionStart.bind(this),
			transitionEnd: this._onTransitionEnd.bind(this),
			transitionInitBefore: this._onTransitionInitBefore.bind(this),
			transitionInitAfter: this._onTransitionInitAfter.bind(this),
		};

		this.lockedSticky = false;
		this.isOverlayOpening = false;
		this.mq = window.matchMedia(this.options.matchMediaAutoCloseOverlay);

		this.setup();
	}

	init() {
		this.menuOverlayRef = this._getInnerComponentByName('MenuOverlay');
		this.menuClassicRef = this._getInnerComponentByName('MenuClassic');

		this._createHeader();
		this._attachEvents();
	}

	destroy() {
		this._detachEvents();

		if (this.instance) {
			this.instance.destroy();
			this.instance = undefined;
		}

		this.lockedSticky = false;
		this.isOverlayOpening = false;
	}

	update() {
		if (this.instance) {
			this.instance.destroy();
			this.instance = undefined;

			this._updateOptions();
			this._createHeader();
		}
	}

	toggleHidden(hidden = false) {
		this.element.classList.toggle('header_hidden-not-opened', hidden);
	}

	lockSticky(lock = false) {
		if (!this.instance || !this.instance.sticky || !this.elements.bar[0]) {
			return
		}

		this.lockedSticky = lock;

		if (!!lock) {
			const stickyClass = this.element.getAttribute('data-arts-header-sticky-class');

			if (stickyClass) {
				this.elements.bar[0].classList.remove(stickyClass);
			}

			this.instance.sticky.disable();
		} else {
			this.instance.sticky.enable();
			this.instance.update();
		}

		this.instance.sticky.locked = lock;
	}

	_getStickyOptions() {
		return app.utilities.isEnabledOption(this.options.sticky) ? {
			containerSelector: this.innerSelectors.bar,
			...this.options.sticky
		} : false;
	}

	_createHeader() {
		this.instance = new ArtsHeader(this.element, {
			init: true,
			matchMedia: false,
			sticky: this._getStickyOptions(),
			overlay: {
				containerSelector: this.innerSelectors.overlayContainer,
				containerSelectorStickyFallback: this.innerSelectors.bar,
				toggleAttributes: {
					'data-arts-color-theme': 'data-arts-header-overlay-color-theme'
				},
				toggleOpenedClass: 'opened',
				toggleAnimatingClass: 'animating',
				onOpen: this._onOverlayOpen.bind(this),
				onClose: this._onOverlayClose.bind(this),
			},
			switcher: {
				elementSelector: this.innerSelectors.overlaySwitcher,
				toggleActiveClass: 'header__burger_opened'
			},
			menu: {
				menuSelector: this.innerSelectors.topLevelMenu,
				submenuBackButtonSelector: this.innerSelectors.submenuBackButton,
				toggleCurrentMenuClass: 'current',
				toggleSubmenuOpenedClass: 'opened-submenu',
				toggleOpeningClass: 'animating',
				beforeOpen: this._onMenuBeforeOpen.bind(this),
				onOpen: this._onMenuOpen.bind(this),
				onClose: this._onMenuClose.bind(this)
			},
			anchors: {
				autoCloseOverlay: true,
				onClick: this._onHeaderAnchorsClick.bind(this)
			},
			heightObserver: {
				containerSelector: this.innerSelectors.bar,
				updateCSSVar: '--header-height',
				observe: this.options.observeHeight
			}
		});
	}

	_onOverlayOpen() {
		const tl = gsap.timeline({
			onStart: () => {
				if (this.menuOverlayRef) {
					this.menuOverlayRef.currentSubmenuRef = null;
					this.menuOverlayRef.currentSubmenuParentRef = null;
				}

				this.isOverlayOpening = true;

				app.utilities.update();
			},
			onComplete: () => {
				this.isOverlayOpening = false;
			}
		})
			.set(this.elements.allSubMenus, {
				visibility: 'hidden',
			})
			.set(this.elements.overlayContainer, {
				autoAlpha: 1,
				zIndex: 400,
			})
			.animateCurtain(this.elements.overlayContainer, {
				animateFrom: 'top',
				duration: 1.2,
				onStart: () => {
					app.utilities.dispatchEvent('arts/header/overlay/beforeOpen');
				},
				onComplete: () => {
					app.utilities.dispatchEvent('arts/header/overlay/afterOpen');
				}
			})
			.to(app.contentEl, {
				autoAlpha: 0,
				onStart: () => {
					app.utilities.dispatchEvent('arts/container/visibility', {
						detail: {
							container: app.containerEl,
							visible: false
						}
					});
					app.utilities.scrollLock(true);
				},
				duration: 0.3
			}, '<50%')
			.fromTo(this.elements.widgets, {
				autoAlpha: 0,
				y: '100%',
				immediateRender: true
			}, {
				autoAlpha: 1,
				y: '0%',
				duration: 1.2,
				ease: 'power4.out',
				stagger: {
					amount: 0.1,
					from: 'start',
					axis: 'y'
				}
			}, '<25%');

		tl.timeScale(app.utilities.getTimeScaleByKey('overlayMenuOpen'));

		return tl;
	}

	_onOverlayClose() {
		const tl = gsap.timeline({
			onComplete: () => {
				if (this.menuOverlayRef) {
					this.menuOverlayRef.disableScroll();
					this.menuOverlayRef.restoreSubmenuOriginalPlacement();
				}
			}
		})
			.to(this.elements.widgets, {
				autoAlpha: 0,
				y: '100%',
				duration: 1.2,
				ease: 'power4.out',
				stagger: {
					amount: 0.1,
					from: 'end',
					axis: 'y'
				}
			})
			.hideCurtain(this.elements.overlayContainer, {
				animateTo: 'top',
				duration: 1.2,
				clearProps: 'all',
				onStart: () => {
					app.utilities.dispatchEvent('arts/header/overlay/beforeClose');
					app.utilities.scrollLock(false);
				},
				onComplete: () => {
					app.utilities.dispatchEvent('arts/header/overlay/afterClose');
				}
			}, '<')
			.to(app.contentEl, {
				autoAlpha: 1,
				duration: 0.3,
				onComplete: () => {
					gsap.set(app.contentEl, {
						clearProps: 'opacity,visibility'
					});

					app.utilities.dispatchEvent('arts/container/visibility', {
						detail: {
							container: app.containerEl,
							visible: true
						}
					});
				}
			}, '<');

		tl.timeScale(app.utilities.getTimeScaleByKey('overlayMenuClose'));

		return tl;
	}

	_onMenuBeforeOpen() {
		this._scrollContainerInnerTop({
			duration: 0
		});
	}

	_scrollContainerInnerTop({
		target = 0,
		duration = 0.5,
		container = this.elements.overlayContainerInner[0]
	} = {}) {
		if (this.elements.overlayContainerInner[0] && this.elements.overlayContainerInner[0].scrollTop > 0) {
			return app.utilities.scrollTo({
				target,
				duration,
				container,
			});
		}
	}

	_onMenuOpen(currentMenu, previousMenu) {
		if (!currentMenu) {
			return;
		}

		const
			isFirstOpenTopLevelMenu = currentMenu === previousMenu,
			speed = app.utilities.getTimeScaleByKey('overlayMenuOpen'),
			currentMenuLabel = currentMenu.getAttribute('aria-label'),
			isTopLevel = this.instance.currentMenuIsTopLevel,
			menuItems = [...currentMenu.querySelectorAll(':scope > li > a')],
			tl = gsap.timeline({
				onStart: () => {
					if (this.menuOverlayRef && this.menuOverlayRef.infiniteList && this.menuOverlayRef.infiniteList.enabled) {
						if (isTopLevel) {
							this.menuOverlayRef.infiniteList.update();
							this.menuOverlayRef.enableScroll();
						} else {
							this.menuOverlayRef.disableScroll();
						}
					}

					if (currentMenuLabel) {
						this._setSubmenuLabelNext(currentMenuLabel);
					}
				}
			});

		// Prepare menu items
		menuItems.forEach((el, index) => {
			tl
				.hideLines(el, {
					duration: 0,
					y: '-103%'
				}, 'start');
		});

		tl.set(currentMenu, {
			visibility: 'visible',
			onComplete: () => {
				this._scrollContainerInnerTop();
			}
		});

		if (!isTopLevel) {
			menuItems.reverse();
		}

		// Animate menu items
		menuItems.forEach((el, index) => {
			let offset = '<';

			if (index === 0 && isFirstOpenTopLevelMenu) {
				offset = 0.6;
			}

			tl.animateLines(el, {
				duration: 1.2 / speed,
				ease: 'power4.out',
				onStart: () => {
					if (index === 0 && this.menuOverlayRef && this.isOverlayOpening) {
						this.menuOverlayRef.scrollListToCurrentTopLevelItem();
					}
				}
			}, offset);
		});

		tl.fromTo(this.elements.submenuLabelCurrent, {
			y: 0,
			autoAlpha: 1
		}, {
			y: -30,
			autoAlpha: 0,
			duration: 0.3,
			onComplete: () => {
				if (isTopLevel) {
					this._setSubmenuLabelCurrent();
				} else {
					this._setSubmenuLabelCurrent(currentMenuLabel);
				}
			}
		}, '<')
			.fromTo(this.elements.submenuLabelNext, {
				y: 30,
				autoAlpha: 0
			}, {
				y: 0,
				autoAlpha: 1,
				duration: 0.3,
				onStart: () => {
					if (currentMenuLabel) {
						this._setSubmenuLabelNext(currentMenuLabel);
					}
				}
			}, '<');

		tl.timeScale(speed);

		return tl;
	}

	_setSubmenuLabelCurrent(text = '') {
		if (this.elements.submenuLabelCurrent[0]) {
			this.elements.submenuLabelCurrent[0].innerHTML = text;
		}
	}

	_setSubmenuLabelNext(text = '') {
		if (this.elements.submenuLabelNext[0]) {
			this.elements.submenuLabelNext[0].innerHTML = text;
		}
	}

	_onMenuClose(currentMenu, previousMenu) {
		if (!previousMenu) {
			return;
		}

		const
			speed = app.utilities.getTimeScaleByKey('overlayMenuClose'),
			tl = gsap.timeline({
				onStart: () => {
					if (previousMenu === this.elements.topLevelMenu[0] && currentMenu !== this.elements.topLevelMenu[0]) {
						if (this.menuOverlayRef) {
							this.menuOverlayRef.moveSubmenuToHolder(currentMenu);
						}
					}
				},
				onComplete: () => {
					if (this.instance.opened && isTopLevel) {
						if (this.menuOverlayRef) {
							this.menuOverlayRef.restoreSubmenuOriginalPlacement();
						}
					}
				}
			}),
			isTopLevel = this.instance.currentMenuIsTopLevel,
			menuItems = [...previousMenu.querySelectorAll(':scope > li > a')];

		menuItems.forEach((el, index) => {
			tl.hideLines(el, {
				duration: 1.2,
				ease: 'power4.out'
			}, 'start');
		});

		tl.set(previousMenu, {
			clearProps: 'visibility,height'
		});

		tl.timeScale(speed);

		return tl;
	}

	_onHeaderAnchorsClick(anchorTarget) {
		app.utilities.scrollTo({
			target: anchorTarget
		});
	}

	_attachEvents() {
		if (typeof this.mq.addEventListener === 'function') {
			this.mq.addEventListener('change', this._handlers.mqChange);
		} else {
			this.mq.addListener(this._handlers.mqChange);
		}

		document.addEventListener('arts/barba/transition/start', this._handlers.transitionStart);
		document.addEventListener('arts/barba/transition/end', this._handlers.transitionEnd);
		document.addEventListener('arts/barba/transition/init/before', this._handlers.transitionInitBefore);
		document.addEventListener('arts/barba/transition/init/after', this._handlers.transitionInitAfter);
	}

	_detachEvents() {
		if (typeof this.mq.removeEventListener === 'function') {
			this.mq.removeEventListener('change', this._handlers.mqChange);
		} else {
			this.mq.removeListener(this._handlers.mqChange);
		}

		document.removeEventListener('arts/barba/transition/start', this._handlers.transitionStart);
		document.removeEventListener('arts/barba/transition/end', this._handlers.transitionEnd);
		document.removeEventListener('arts/barba/transition/init/before', this._handlers.transitionInitBefore);
		document.removeEventListener('arts/barba/transition/init/after', this._handlers.transitionInitAfter);
	}

	_onMQChange(event) {
		if (event.matches && this.menuOverlayRef && this.menuClassicRef && this.instance.opened) {
			this.instance.toggleOverlay(false, true);
		}
	}

	_onTransitionStart() {
		if (this.instance && this.instance.sticky && this.elements.bar[0]) {
			const stickyClass = this.element.getAttribute('data-arts-header-sticky-class');

			if (stickyClass) {
				this.elements.bar[0].classList.remove(stickyClass);
			}

			this.instance.sticky.disable();
		}
	}

	_onTransitionEnd() {
		if (this.instance) {
			this.instance.update();
		}
	}

	_onTransitionInitBefore() {
		if (this.menuOverlayRef && this.menuOverlayRef.infiniteList && this.menuOverlayRef.infiniteList.enabled) {
			this.menuOverlayRef.infiniteList.controller.lanes[0].items.destroy();
		}

	}
	_onTransitionInitAfter() {
		if (this.menuOverlayRef && this.menuOverlayRef.infiniteList && this.menuOverlayRef.infiniteList.enabled) {
			this.menuOverlayRef.infiniteList.update();
		}
	}
}

export default class Gui extends BaseComponent {
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
			innerElements: {},
		});

		this._handlers = {
			updateHeader: app.utilities.debounce(this._onUpdateHeader.bind(this), 300),
			transitionInit: this._onTransitionInit.bind(this)
		};
		this.logos = {
			'Primary': 'primary',
			'Secondary': 'secondary'
		};
		this.themes = {
			'Dark': 'dark',
			'Light': 'light',
			'Auto (inherit)': 'null',
		};
		this.headerLayouts = {
			'Classic Menu / Logo Left / Menu Right': {
				className: 'header_classic-menu-right',
				url: '08-04-01-classic-menu-logo-left-menu-right.html'
			},
			'Classic Menu / Logo Left / Menu Left': {
				className: 'header_classic-menu-left',
				url: '08-04-02-classic-menu-logo-left-menu-left.html'
			},
			'Classic Menu / Logo Left / Menu Center': {
				className: 'header_classic-menu-center',
				url: '08-04-03-classic-menu-logo-left-menu-center.html'
			},
			'Classic Menu / Logo Center / Menu Split': {
				className: 'header_classic-menu-split-center',
				url: '08-04-04-classic-menu-logo-center-menu-split.html'
			},

			'Overlay Menu / Logo Left / Burger Right': {
				className: 'header_overlay-logo-left-burger-right',
				url: '08-05-01-overlay-menu-logo-left-burger-right.html'
			},
			'Overlay Menu / Logo Center / Burger Right': {
				className: 'header_overlay-logo-center-burger-right',
				url: '08-05-02-overlay-menu-logo-center-burger-right.html'
			},
			'Overlay Menu / Logo Center / Burger Left': {
				className: 'header_overlay-logo-center-burger-left',
				url: '08-05-03-overlay-menu-logo-center-burger-left.html'
			},
		};
		this.headerClasses = {
			'Classic Menu / Logo Left / Menu Right': '08-04-01-classic-menu-logo-left-menu-right.html',
			'Classic Menu / Logo Left / Menu Left': '08-04-02-classic-menu-logo-left-menu-left.html',
			'Classic Menu / Logo Left / Menu Center': '08-04-03-classic-menu-logo-left-menu-center.html',
			'Classic Menu / Logo Center / Menu Split': '08-04-04-classic-menu-logo-center-menu-split.html',

			'Overlay Menu / Logo Left / Burger Right': '08-05-01-overlay-menu-logo-left-burger-right.html',
			'Overlay Menu / Logo Center / Burger Right': '08-05-02-overlay-menu-logo-center-burger-right.html',
			'Overlay Menu / Logo Center / Burger Left': '08-05-03-overlay-menu-logo-center-burger-left.html',
		}
		this.backgrounds = {
			'Light 1': 'bg-light-1',
			'Light 2': 'bg-light-2',
			'Light 3': 'bg-light-3',
			'Light 4': 'bg-light-4',
			'Platinum 1': 'bg-platinum-1',
			'Platinum 2': 'bg-platinum-2',
			'Gray 1': 'bg-gray-1',
			'Gray 2': 'bg-gray-2',
			'Gray 3': 'bg-gray-3',
			'Gray 4': 'bg-gray-4',
			'Dark 1': 'bg-dark-1',
			'Dark 2': 'bg-dark-2',
			'Dark 3': 'bg-dark-3',
			'Dark 4': 'bg-dark-4',
			'Auto (inherit)': 'null'
		};
		this.presets = {
			'Light 1': {
				background: 'bg-light-1',
				theme: 'light',
				logo: 'primary'
			},
			'Light 2': {
				background: 'bg-light-2',
				theme: 'light',
				logo: 'primary'
			},
			'Light 3': {
				background: 'bg-light-3',
				theme: 'light',
				logo: 'primary'
			},
			'Light 4': {
				background: 'bg-light-4',
				theme: 'light',
				logo: 'primary'
			},
			'Platinum 1': {
				background: 'bg-platinum-1',
				theme: 'dark',
				logo: 'secondary'
			},
			'Platinum 2': {
				background: 'bg-platinum-2',
				theme: 'dark',
				logo: 'secondary'
			},
			'Gray 1': {
				background: 'bg-gray-1',
				theme: 'dark',
				logo: 'secondary'
			},
			'Gray 2': {
				background: 'bg-gray-2',
				theme: 'light',
				logo: 'primary'
			},
			'Gray 3': {
				background: 'bg-gray-3',
				theme: 'dark',
				logo: 'secondary'
			},
			'Gray 4': {
				background: 'bg-gray-4',
				theme: 'dark',
				logo: 'secondary'
			},
			'Dark 1': {
				background: 'bg-dark-1',
				theme: 'dark',
				logo: 'secondary'
			},
			'Dark 2': {
				background: 'bg-dark-2',
				theme: 'dark',
				logo: 'secondary'
			},
			'Dark 3': {
				background: 'bg-dark-3',
				theme: 'dark',
				logo: 'secondary'
			},
			'Dark 4': {
				background: 'bg-dark-4',
				theme: 'dark',
				logo: 'secondary'
			},
			'Auto (inherit)': {
				background: 'null',
				theme: 'null',
				logo: 'primary'
			}
		};
		this.controls = {
			header: {
				'Layout': null,
				'Color Theme': null,
				'Logo': null,
				'Sticky Background': null,
				'Sticky Logo': null,
				'Sticky Color Theme': null
			},
			menu: {
				'Color Theme': null,
				'Background': null
			},
			main: {
				'Cursor Follower': app.utilities.isEnabledOption(app.options.cursorFollower),
				'Smooth Scrolling': app.utilities.isEnabledOption(app.options.smoothScroll),
				'Color Theme': null,
				'Background': null
			},
			download: {
				'Download Asli HTML Template': () => window.open(
					'https://themeforest.net/item/asli-ajax-portfolio-html5-template/45162964?aid=artemsemkin&aso=demo&aca=gui',
					'_blank'
				)
			}
		};
		this.folders = {
			header: null,
			menu: null,
			main: null,
			cursor: null
		};
		this.controller;
		this.initialized = false;

		this.setup();
	}

	init() {
		this.updateRef('headerRef', 'Header');
		this.updateRef('cursorRef', 'CursorFollower');
		this.updateRef('scrollRef', 'Scroll');

		this.instance = new dat.GUI({
			width: 450
		});

		this.element.appendChild(this.instance.domElement);

		if (this.headerRef) {
			this._addHeaderControls();
			this._initHeaderControls();

			if (this.headerRef.elements.overlayContainer[0]) {
				this._addMenuControls();
				this._initMenuControls();
			}
		}

		if (app.containerEl) {
			this._addMainControls();
			this._initMainControls();
		}

		this.instance.add(this.controls.download, 'Download Asli HTML Template');

		this.instance.show();
		this.instance.close();

		this._attachEvents();

		this.initialized = true;
	}

	destroy() {
		document.removeEventListener('arts/barba/transition/init/after', this._handlers.transitionInit);

		this.initialized = false;
	}

	_attachEvents() {
		document.addEventListener('arts/barba/transition/init/after', this._handlers.transitionInit);
	}

	_addHeaderControls() {
		this.folders.header = this.instance.addFolder('Header');

		// Layout
		this.headerLayout = this.folders.header.add(this.controls.header, 'Layout', this.headerClasses)
		this.headerLayout.onChange((value) => {
			if (!this.initialized) {
				return;
			}

			barba.request(value).then((html) => {
				app.utilities.scrollTo({
					target: 0,
					duration: window.pageYOffset > 1 ? 0.6 : 0,
					cb: () => {
						const
							tl = gsap.timeline({
								defaults: {
									duration: 0.2
								}
							}),
							parser = new DOMParser(),
							currentHeader = document.querySelector('#page-header'),
							currentBar = currentHeader && currentHeader.querySelector('.js-header__bar'),
							newDOM = parser.parseFromString(html, 'text/html'),
							newHeader = newDOM.querySelector('#page-header'),
							newBar = newHeader && newHeader.querySelector('.js-header__bar');

						this.headerRef.components.forEach((innerComponent) => {
							innerComponent.destroy();
						});

						this.headerRef.destroy();

						for (const [key] of Object.entries(this.headerClasses)) {
							currentHeader.classList.remove(this.headerLayouts[key].className);
						}

						for (const [key] of Object.entries(this.headerClasses)) {
							if (newHeader && newHeader.classList.contains(this.headerLayouts[key].className)) {
								currentHeader.classList.add(this.headerLayouts[key].className);
							}
						}

						[...newHeader.attributes].forEach(attr => newHeader.removeAttribute(attr.name));
						[...currentHeader.attributes].forEach(attr => newHeader.setAttribute(attr.name, attr.value));

						if (currentBar && newBar) {
							currentBar.setAttribute('class', newBar.getAttribute('class'));
						}

						this._updateNodesAttributes({
							currentDOM: newDOM,
							newDOM: document,
						});

						tl.to([currentBar, newBar], {
							autoAlpha: 0,
							transition: 'none',
							onComplete: () => {
								currentHeader.replaceWith(newHeader);
								app.utilities.update();
							}
						})
							.to(newBar, {
								autoAlpha: 1,
								clearProps: 'opacity,visibility,transition',
								onComplete: () => {
									this._reloadHeader();
								}
							});
					}
				});
			});
		});

		// Color theme
		this.headerColorTheme = this.folders.header.add(this.controls.header, 'Color Theme', this.themes);
		this.headerColorTheme.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-color-theme',
				value,
				callback: this._handlers.updateHeader
			});

			if (!!this.initialized) {
				const logo = this._getSyncedPresetValue(value, 'theme', 'logo');
				this.headerLogo.setValue(logo);
			}
		});

		// Logo
		this.headerLogo = this.folders.header.add(this.controls.header, 'Logo', this.logos);
		this.headerLogo.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-header-logo',
				value,
				callback: this._handlers.updateHeader
			});
		});

		// Sticky Background
		this.headerStickyBackground = this.folders.header.add(this.controls.header, 'Sticky Background', this.backgrounds);
		this.headerStickyBackground.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-header-sticky-class',
				value,
				callback: this._handlers.updateHeader
			});

			if (!!this.initialized) {
				const theme = this._getSyncedPresetValue(value, 'background', 'theme');
				const logo = this._getSyncedPresetValue(value, 'background', 'logo');

				this.headerStickyColorTheme.setValue(theme);
				this.headerStickyLogo.setValue(logo);
			}
		});

		// Sticky Color Theme
		this.headerStickyColorTheme = this.folders.header.add(this.controls.header, 'Sticky Color Theme', this.themes);
		this.headerStickyColorTheme.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-header-sticky-color-theme',
				value,
				callback: this._handlers.updateHeader
			});
		});

		// Sticky Logo
		this.headerStickyLogo = this.folders.header.add(this.controls.header, 'Sticky Logo', this.logos);
		this.headerStickyLogo.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-header-sticky-logo',
				value,
				callback: this._handlers.updateHeader
			});

			if (!!this.initialized) {
				this.headerLogo.setValue(this.headerLogo.getValue());
			}
		});

		this.folders.header.open();
		this.folders.header.show();
	}

	_addMenuControls() {
		this.folders.menu = this.instance.addFolder('Overlay Menu');

		// Background
		this.headerMenuOverlayBackground = this.folders.menu.add(this.controls.menu, 'Background', this.backgrounds);
		this.headerMenuOverlayBackground.onChange((value) => {
			this._changeBackgroundClass({
				element: this.headerRef.elements.overlayContainer[0],
				value
			});

			if (!!this.initialized) {
				const theme = this._getSyncedPresetValue(value, 'background', 'theme');

				this.headerMenuOverlayColorTheme.setValue(theme);
			}
		});

		// Color Theme
		this.headerMenuOverlayColorTheme = this.folders.menu.add(this.controls.menu, 'Color Theme', this.themes);
		this.headerMenuOverlayColorTheme.onChange((value) => {
			this._changeAttribute({
				element: this.headerRef.elements.bar[0],
				attribute: 'data-arts-header-overlay-color-theme',
				value
			});

			document.removeEventListener('arts/header/overlay/afterClose', this._handlers.updateHeader, { once: true });

			if (!!this.headerRef.instance.opened) {
				this._changeAttribute({
					element: this.headerRef.elements.bar[0],
					attribute: 'data-arts-color-theme',
					value
				});

				document.addEventListener('arts/header/overlay/afterClose', this._handlers.updateHeader, { once: true });
			} else {
				this._handlers.updateHeader();
			}
		});

		document.addEventListener('arts/header/overlay/beforeOpen', () => {
			this.folders.menu.show();

			if (this.folders.header) {
				this.folders.header.hide();
			}

			if (this.folders.main) {
				this.folders.main.hide();
			}
		});

		document.addEventListener('arts/header/overlay/beforeClose', () => {
			this.folders.menu.hide();

			if (this.folders.header) {
				this.folders.header.show();
			}

			if (this.folders.main) {
				this.folders.main.show();
			}
		});

		this.folders.menu.hide();
		this.folders.menu.open();
	}

	_reloadHeader() {
		app.componentsManager.instances.persistent.forEach((instance, index) => {
			if (instance.name === 'Header') {
				app.componentsManager.instances.persistent[index] = null;
				delete app.componentsManager.instances.persistent[index];
			}
		});

		app.loadHeader().then(() => {
			// Refresh header reference
			[...app.componentsManager.instances.disposable]
				.filter((component) => component && 'headerRef' in component)
				.forEach((component) => component.headerRef = app.componentsManager.getComponentByName('Header'));

			this.headerRef = app.componentsManager.getComponentByName('Header');
			this.headerRef.elements.overlayContainer[0] = this.headerRef.element.querySelector('.header__wrapper-overlay-menu');
		});
	}

	_reloadScroll() {
		if (this.scrollRef) {
			this.scrollRef.destroy();
		}

		app.componentsManager.instances.persistent.forEach((instance, index) => {
			if (instance.name === 'Scroll') {
				app.componentsManager.instances.persistent[index] = null;
				delete app.componentsManager.instances.persistent[index];
			}
		});

		app.loadScroll(false).then(() => {
			// Refresh header reference
			[...app.componentsManager.instances.disposable]
				.filter((component) => component && 'scrollRef' in component)
				.forEach((component) => component.scrollRef = app.componentsManager.getComponentByName('Scroll'));

			this.scrollRef = app.componentsManager.getComponentByName('Scroll');
		});
	}

	_reloadCursor() {
		if (this.cursorRef) {
			this.cursorRef.destroy();
		}

		app.componentsManager.instances.persistent.forEach((instance, index) => {
			if (instance.name === 'CursorFollower') {
				app.componentsManager.instances.persistent[index] = null;
				delete app.componentsManager.instances.persistent[index];
			}
		});

		app.loadCursor().then(() => {
			// Refresh cursor reference
			[...app.componentsManager.instances.disposable]
				.filter((component) => component && 'cursorRef' in component)
				.forEach((component) => component.cursorRef = app.componentsManager.getComponentByName('CursorFollower'));

			this.cursorRef = app.componentsManager.getComponentByName('CursorFollower');
		});
	}

	_addMainControls() {
		this.folders.main = this.instance.addFolder('Container');

		// Smooth Scrolling
		this.mainSmoothScrolling = this.folders.main.add(this.controls.main, 'Smooth Scrolling', { 'On': true, 'Off': false })
		this.mainSmoothScrolling.onChange((value) => {
			if (value === 'true') {
				app.options.smoothScroll.enabled = true;

				if (!this.scrollRef.instance) {
					this._reloadScroll();
				}
			} else {
				app.options.smoothScroll.enabled = false;

				this.scrollRef.destroy();
			}
		});

		// Cursor Follower
		this.mainCursorFollower = this.folders.main.add(this.controls.main, 'Cursor Follower', { 'On': true, 'Off': false })
		this.mainCursorFollower.onChange((value) => {
			if (value === 'true') {
				app.options.cursorFollower.enabled = true;

				if (this.cursorRef && !this.cursorRef.instance.enabled) {
					this.cursorRef.init();
				} else {
					this._reloadCursor();
				}
			} else {
				app.options.cursorFollower.enabled = false;

				if (this.cursorRef && !!this.cursorRef.instance.enabled) {
					this.cursorRef.destroy();
				}
			}
		});

		// Background
		this.mainBackground = this.folders.main.add(this.controls.main, 'Background', this.backgrounds);
		this.mainBackground.onChange((value) => {
			this._changeBackgroundClass({
				element: app.containerEl,
				value
			});

			if (!!this.initialized) {
				const theme = this._getSyncedPresetValue(value, 'background', 'theme');

				if (this.headerColorTheme) {
					this.headerColorTheme.setValue(theme);
				}

				if (this.headerStickyBackground) {
					this.headerStickyBackground.setValue(this.headerStickyBackground.getValue());
				}

				if (this.headerMenuOverlayBackground) {
					this.headerMenuOverlayBackground.setValue(this.headerMenuOverlayBackground.getValue());
				}

				this.mainColorTheme.setValue(theme);
			}
		});

		// Color Theme
		this.mainColorTheme = this.folders.main.add(this.controls.main, 'Color Theme', this.themes);
		this.mainColorTheme.onChange((value) => {
			this._changeAttribute({
				element: app.containerEl,
				attribute: 'data-arts-color-theme',
				value
			});

			if (!!this.initialized && this.cursorRef) {
				this.cursorRef.update();
			}
		});

		this.folders.main.show();
		this.folders.main.open();
	}

	_initHeaderControls() {
		const
			element = this.headerRef.elements.bar[0],
			colorTheme = element.getAttribute('data-arts-color-theme'),
			logo = element.getAttribute('data-arts-header-logo'),
			stickyLogo = element.getAttribute('data-arts-header-sticky-logo'),
			stickyBackground = element.getAttribute('data-arts-header-sticky-class'),
			stickyTheme = element.getAttribute('data-arts-header-sticky-color-theme'),
			AJAX = app.componentsManager.getComponentByName('AJAX');

		this.headerColorTheme.setValue(colorTheme);
		this.headerLogo.setValue(logo);
		this.headerStickyLogo.setValue(stickyLogo);
		this.headerStickyBackground.setValue(stickyBackground);
		this.headerStickyColorTheme.setValue(stickyTheme);

		if (!AJAX || (AJAX && !AJAX.running)) {
			for (const [key, value] of Object.entries(this.headerLayouts)) {
				if (value.className && this.headerRef.element.classList.contains(value.className)) {
					this.headerLayout.setValue(value.url);
				}
			}
		}
	}

	_initMenuControls() {
		let overlayColorTheme = this.headerRef.element.getAttribute('data-arts-header-overlay-color-theme');

		if (!overlayColorTheme) {
			overlayColorTheme = this.headerRef.elements.overlayContainer[0].getAttribute('data-arts-color-theme');
		}

		this.headerMenuOverlayColorTheme.setValue(overlayColorTheme);

		for (const [key, value] of Object.entries(this.backgrounds)) {
			if (this.headerRef.elements.overlayContainer[0].classList.contains(value)) {
				this.headerMenuOverlayBackground.setValue(value);
			}
		}
	}

	_initMainControls() {
		const mainColorTheme = app.containerEl.getAttribute('data-arts-color-theme');

		this.mainColorTheme.setValue(mainColorTheme);

		for (const [key, value] of Object.entries(this.backgrounds)) {
			if (app.containerEl.classList.contains(value)) {
				this.mainBackground.setValue(value);
			}
		}
	}

	_changeAttribute({ element, attribute, value, callback } = {}) {
		if (element instanceof HTMLElement && typeof attribute === 'string') {
			if (value && value !== 'null') {
				element.setAttribute(attribute, value)
			} else {
				element.removeAttribute(attribute);
			}

			if (typeof callback === 'function') {
				callback();
			}
		}
	}

	_changeBackgroundClass({ element, value, callback } = {}) {
		if (element instanceof HTMLElement) {
			for (const [key, val] of Object.entries(this.backgrounds)) {
				element.classList.remove(val);
			}

			element.classList.add(value);

			if (typeof callback === 'function') {
				callback();
			}
		}
	}

	_onUpdateHeader() {
		if (!this.initialized) {
			return;
		}

		for (const [key, value] of Object.entries(this.presets)) {
			this.headerRef.elements.bar[0].classList.remove(value['background']);
		}

		const savedOpened = this.headerRef.instance.overlay.opened;

		this.headerRef.instance.overlay.opened = false;
		this.headerRef.reload();
		this.headerRef.instance.overlay.opened = savedOpened;
	}

	_getSyncedPresetValue(compairingValue, key = 'background', returnKey = 'theme') {
		for (let [id, value] of Object.entries(this.presets)) {
			if (compairingValue === value[key]) {
				return value[returnKey];
			}
		}
	}

	_onTransitionInit() {
		this.initialized = false;

		if (this.headerRef) {
			this._initHeaderControls();

			if (this.headerRef.elements.overlayContainer[0]) {
				this._initMenuControls();
			}
		}

		this._initMainControls();

		this.initialized = true;
	}

	_updateNodesAttributes({ currentDOM, newDOM, nodes = [
		'#page-header',
		'#page-header .js-header__bar',
		'#page-header .menu-classic li',
		'#page-header .menu-overlay li',
		'#page-header .header__wrapper-overlay-menu'
	] } = {
			currentDOM: document,
			newDOM: undefined,
			nodes: [
				'#page-header',
				'#page-header .js-header__bar',
				'#page-header .menu-classic li',
				'#page-header .menu-overlay li',
				'#page-header .header__wrapper-overlay-menu'
			]
		}) {
		const nodesToUpdate = nodes
			.map(selector => selector.trim())
			.filter(selector => selector.length > 0);

		nodesToUpdate.forEach((selector) => {
			let
				currentItems = [...currentDOM.querySelectorAll(selector)],
				nextItems = [...newDOM.querySelectorAll(selector)];

			// different type of menu (overlay) found on the next page
			if (selector === '#page-header .menu-classic li' && !nextItems.length) {
				nextItems = [...newDOM.querySelectorAll('#page-header .menu-overlay li')];
			}

			// different type of menu (classic) found on the next page
			if (selector === '#page-header .menu-overlay li' && !nextItems.length) {
				nextItems = [...newDOM.querySelectorAll('#page-header .menu-classic li')];
			}

			if (nextItems.length) {
				this._syncAttributes(currentItems, nextItems);
			}
		});
	}

	_syncAttributes(targetElements, sourceElements) {
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
	}
}

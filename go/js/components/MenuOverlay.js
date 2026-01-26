export default class MenuOverlay extends BaseComponent {
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
				matchMedia: '(min-width: 992px)',
				loop: true,
				autoCenterCurrentItem: true,
				scroll: app.options.virtualScroll,
				type: 'wheel,touch',
				wheelSpeed: -1,
				speedEffect: {
					skew: -0.1,
					scale: -0.1,
				}
			},
			// Component inner elements
			innerElements: {
				topLevelItems: ':scope > li',
				allSubMenus: '.sub-menu',
			}
		});

		this.submenuHolder = null;
		this.currentSubmenuRef = null;
		this.currentSubmenuParentRef = null;

		this.setup();
	}

	init() {
		if (this.elements.allSubMenus.length) {
			this._createSubmenuHolder();
			this._addSubmenusLabels();
		}

		this._createInfiniteList();
	}

	destroy() {
		if (this.infiniteList) {
			this.infiniteList.destroy();
		}
	}

	scrollListToCurrentTopLevelItem() {
		if (this.infiniteList && this.infiniteList.enabled && !!this.options.autoCenterCurrentItem) {
			const position = this.options.loop ? 'center' : 'start';

			this.infiniteList.pluginsReady.then(() => {
				this.infiniteList.controller.scrollTo({ indexItem: this._getCurrentTopLevelItemIndex(), position, animate: false });
			});
		}
	}

	enableScroll() {
		if (this.infiniteList && this.infiniteList.enabled) {
			this.infiniteList.pluginsReady.then(() => {
				this.infiniteList.plugins.scroll.enable();
			});
		}
	}

	disableScroll() {
		if (this.infiniteList && this.infiniteList.enabled) {
			this.infiniteList.pluginsReady.then(() => {
				this.infiniteList.plugins.scroll.disable();
			});
		}
	}

	moveSubmenuToHolder(submenu) {
		if (submenu && submenu.parentElement) {
			this.currentSubmenuRef = submenu;
			this.currentSubmenuParentRef = submenu.parentElement;

			if (this.submenuHolder) {
				this.submenuHolder.appendChild(submenu);
			}
		}
	}

	restoreSubmenuOriginalPlacement() {
		if (this.currentSubmenuParentRef && this.currentSubmenuRef) {

			this.currentSubmenuParentRef.appendChild(this.currentSubmenuRef);

			this.currentSubmenuRef = null;
			this.currentSubmenuParentRef = null;
		}
	}

	_createInfiniteList() {
		this.infiniteList = new ArtsInfiniteList(this.element, {
			direction: 'vertical',
			listElementsSelector: ':scope > li',
			matchMedia: this.options.matchMedia,
			multiLane: false,
			loop: this.options.loop,
			autoClone: this.options.loop,
			scroll: this.options.scroll,
			plugins: {
				scroll: {
					type: this.options.type,
					preventDefault: true
				},
				speedEffect: this.options.speedEffect
			},
			focusObserver: {
				watchListElements: false,
				debounceTime: 1200
			},
		});
	}

	_getCurrentTopLevelItemIndex() {
		let currentMenuItemIndex = 0;

		this.elements.topLevelItems.forEach((el, index) => {
			if (el.classList.contains('current-menu-ancestor') || el.classList.contains('current-menu-item')) {
				currentMenuItemIndex = index;
			}
		});

		return currentMenuItemIndex;
	}

	_addSubmenusLabels() {
		this.elements.allSubMenus.forEach((el) => {
			const openerHeading = el.parentElement.querySelector('a .menu-overlay__heading');

			el.setAttribute('aria-label', openerHeading.textContent);
		});
	}

	_createSubmenuHolder() {
		const holder = document.createElement('div');

		holder.classList.add('sub-menu-holder');

		this.element.appendChild(holder);
		this.submenuHolder = holder;
	}
}

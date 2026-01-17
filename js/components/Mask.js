export default class Mask extends BaseComponent {
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
				scaleX: 1,
				scaleY: 1,
				autoParentRelative: true,
				clone: true,
				color: 'var(--color-accent-dark-theme)'
			},
			// Component inner elements
			innerElements: {
				target: '.js-mask__target',
				source: '.js-mask__source'
			},
		});

		this.rect = {
			source: {
				width: 0,
				height: 0,
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			},
			target: {
				width: 0,
				height: 0,
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			}
		};
		this.props = {
			offsetLeft: 0,
			offsetTop: 0,
			borderRadius: 0,
			zIndex: 0
		};
		this._handlers = {
			updateMask: app.utilities.debounce(this._updateMaskClipPath.bind(this), app.utilities.getDebounceTime()),
			repaintMask: this._repaintMask.bind(this)
		};

		this.maskedEl;
		this.scaleX = this.options.scaleX || 1;
		this.scaleY = this.options.scaleY || 1;

		this.setup();
	}

	init() {
		if (this.elements.source[0] && this.elements.target[0]) {
			this.updateRef('preloaderRef', 'Preloader');

			if (!!this.options.clone) {
				this._cloneTarget();
			} else {
				this.maskedEl = this.elements.target[0];
			}

			this._updateMaskClipPath();
			this._attachEvents();
		}
	}

	destroy() {
		this._detachEvents();
		this._clean();
	}

	update() {
		this._updateMaskClipPath();
	}

	_attachEvents() {
		this.resizeInstance = new ResizeObserver(this._handlers.updateMask);
		this.resizeInstance.observe(this.element);
		this.resizeInstance.observe(this.elements.source[0]);

		if (this.parent && this.parent.element) {
			this.parent.element.addEventListener('animation/update', this._handlers.repaintMask);
			this.parent.element.addEventListener('animation/start', this._handlers.updateMask);
		}

		if (this.preloaderRef) {
			this.preloaderRef.loaded.then(this._handlers.updateMask);
		}
	}

	_detachEvents() {
		if (this.resizeInstance) {
			this.resizeInstance.disconnect();
			this.resizeInstance = null;
		}

		if (this.parent && this.parent.element) {
			this.parent.element.removeEventListener('animation/update', this._handlers.repaintMask);
			this.parent.element.removeEventListener('animation/start', this._handlers.updateMask);
		}
	}

	_cloneTarget() {
		const
			parentEl = this.elements.target[0].parentElement,
			commentNodeBefore = document.createComment(` ### Mask Clone ### `),
			commentNodeAFter = document.createComment(` ### - Mask Clone ### `);

		this.destroySplitText();
		this.maskedEl = this.elements.target[0].cloneNode(true);
		this.maskedEl.classList.add('js-mask__clone');
		this.maskedEl.classList.remove(this.innerSelectors.target.replace('.', ''));
		this.maskedEl.style.position = 'absolute';

		if (typeof this.options.color === 'string') {
			this.maskedEl.style.color = this.options.color;
			this.maskedEl.classList.add('js-mask__clone_has-color');
		}

		if (!!this.options.autoParentRelative) {
			if (parentEl && window.getComputedStyle(parentEl).position !== 'relative') {
				parentEl.style.position = 'relative';
			}
		}

		this.elements.target[0].after(this.maskedEl);
		this._initSplitText();
		this.maskedEl.before(commentNodeBefore);
		this.maskedEl.after(commentNodeAFter);
	}

	_updateMaskClipPath() {
		this._clean();
		this._updateRect();
		this._updateProps();
		this.setMask();
	}

	_updateProps() {
		Object.assign(this.props, {
			offsetLeft: this.elements.target[0].offsetLeft,
			offsetTop: this.elements.target[0].offsetTop,
			borderRadiusPercent: gsap.getProperty(this.elements.source[0], 'borderRadius'),
			borderRadiusPixels: gsap.getProperty(this.elements.source[0], 'borderRadius', 'px'),
			zIndex: gsap.getProperty(this.elements.target[0], 'zIndex') + 1,
		});
	}

	_clean() {
		gsap.set(this.maskedEl, {
			clearProps: 'top,left,width,height,margin,zIndex,pointerEvents,clipPath,transform'
		});
	}

	_updateRect() {
		Object.assign(this.rect, {
			target: this.elements.target[0].getBoundingClientRect(),
			source: this.elements.source[0].getBoundingClientRect()
		});
	}

	_repaintMask() {
		if (this.maskedEl) {
			const savedClipPath = this.maskedEl.style.clipPath;

			this.maskedEl.style.clipPath = 'none';
			this.maskedEl.offsetWidth;
			this.maskedEl.style.clipPath = savedClipPath;
		}
	}

	setMask() {
		let vars = {
			position: 'absolute',
			top: this.props.offsetTop,
			left: this.props.offsetLeft,
			width: this.rect.target.width,
			height: this.rect.target.height,
			margin: 0,
			pointerEvents: 'none',
			zIndex: this.props.zIndex
		};

		const
			radiusX = this.rect.source.width / 2,
			radiusY = this.rect.source.height / 2;

		// Oval shape
		if (this.props.borderRadiusPercent === 100) {
			const
				positionX = this.rect.source.left - this.rect.target.left + radiusX,
				positionY = this.rect.source.top - this.rect.target.top + radiusY;

			vars['clipPath'] = `ellipse(${radiusX}px ${radiusY}px at ${positionX}px ${positionY}px)`;
		} else { // Rectangle shape
			const
				offsetX = radiusX - radiusX * this.scaleX,
				offsetY = radiusY - radiusY * this.scaleY,
				top = this.rect.source.top - this.rect.target.top + offsetY,
				right = this.rect.target.right - this.rect.source.right + offsetX,
				bottom = this.rect.target.bottom - this.rect.source.bottom + offsetY,
				left = this.rect.source.left - this.rect.target.left + offsetX;

			vars['clipPath'] = `inset(${top}px ${right}px ${bottom}px ${left}px round ${this.props.borderRadiusPixels})`;
		}

		gsap.set(this.maskedEl, vars);
	}
}

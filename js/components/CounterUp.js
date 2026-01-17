export default class CounterUp extends BaseComponent {
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
				start: 0,
				target: 20,
				duration: 4,
				prefix: false,
				suffix: false,
				ease: 'power4.out',
				zeros: 2
			},
			// Component inner elements
			innerElements: {
				number: '.js-counter-up__number'
			},
		});
		this.counter = {
			value: this.options.start
		};
		this._tl = gsap.timeline();

		this.setup();
	}

	init() {
		this._updateValue(this.options.start);
	}

	getRevealAnimation() {
		const tl = gsap.timeline({
			paused: true
		});

		tl.to(this.counter, {
			value: parseFloat(this.options.target).toFixed(0),
			duration: this.options.duration,
			ease: this.options.ease,
			onUpdate: () => { this._updateValue(this.counter.value); }
		});

		return tl;
	}

	_updateValue(value) {
		if (this.elements.number.length) {
			let contents = '';

			if (typeof this.options.prefix === 'string' && this.options.prefix.length) {
				contents += `<span class="counter-up__prefix js-counter-up__prefix">${this.options.prefix}</span>`;
			}

			contents += this._addZeros(parseFloat(value).toFixed(0), this.options.zeros);

			if (typeof this.options.suffix === 'string' && this.options.suffix.length) {
				contents += `<span class="counter-up__suffix js-counter-up__suffix">${this.options.suffix}</span>`;
			}

			this.elements.number[0].innerHTML = contents;
		}
	}

	_addZeros(value, zeros) {
		while (value.toString().length < zeros) {
			value = `0${value}`;
		}

		return value;
	}
}

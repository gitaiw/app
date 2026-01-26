export default class MyCustomComponent extends BaseComponent {
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
        myOption1: true,
        myOption2: 'stringValue',
        myAnotherOption: 55,
      },
      // Component inner elements
      innerElements: {
        myInnerElementsSet: '.js-my-custom-component__element',
        myAnotherInnerElementsSet: '.js-my-custom-component__another-element',
      }
    });

    // Setup the component and run init() function
    this.setup();
  }

  // Component code goes here
  init() {
    // You can organize it in functions
    this.myFunction1();
    this.myFunction2();
    this.myFunction3();
  }

  // This is the place to clean up your component work if needed (optional)
  destroy() {
    console.log('This code will be automatically executed before the next page is loaded in AJAX transition');
  }

  // Prepare your animation scene here (set initial values, positions, transforms, etc)
  prepareAnimation() {
    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => resolve(true)
      });

      if (this.elements.myInnerElementsSet.length) {
        tl.set(this.elements.myInnerElementsSet, {
          y: '100%',
          autoAlpha: 0
        });
      }
    });
  }

  // Put the actual on-scroll animation scene there
  getRevealAnimation() {
    const tl = gsap.timeline({
      paused: true
    });

    if (this.elements.myInnerElementsSet.length) {
      tl.to(this.elements.myInnerElementsSet, {
        y: '0%',
        autoAlpha: 1,
        stagger: 0.2
      });
    }

    return tl;
  }

  myFunction1() {
    console.log('1. Custom code here...');
  }

  myFunction2() {
    console.log('2. Custom code there...');
  }

  myFunction3() {
    console.log('3. Third function call');

    // Use "this.options" to get a parsed object of the component options
    console.log(`Here goes the value of "myOption1": ${this.options.myOption1}`);
    console.log(`Here goes the value of "myOption2": ${this.options.myOption2}`);
    console.log(`Here goes the value of "myAnotherOption": ${this.options.myAnotherOption}`);

    // Use "this.element" for the reference of the component HTML element
    console.log(`This is the component container HTML element`);
    console.log(this.element);
    console.log(`=================`);

    // Use "this.elements" for the references of the inner component elements
    console.log(`Component inner elements:`);
    console.log(this.elements);
    console.log(`=================`);

    // Use "this.innerSelectors" to get the original selectors of inner elements
    console.log(`Here are selectors of the inner elements:`);
    console.log(this.innerSelectors);
    console.log(`=================`);
  }
}

export default class GMap extends BaseComponent {
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
				googleMapAPIScriptSelector: 'script[src*="maps.googleapis.com/maps/api"]',
				zoom: 10,
				markerOptionsAttribute: 'data-marker-options',
				markerContentAttribute: 'data-marker-content',
				styles: '[{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#111111"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#111111"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#111111"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#111111"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#111111"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#111111"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#111111"},{"lightness":17}]}]'
			},
			// Component inner elements
			innerElements: {
				container: '.js-gmap__container',
				markers: '.js-gmap__marker',
			},
		});
		this.prevInfoWindow = false;

		this.setup();
	}

	init() {
		if (this._isGoogleMapsAPILoaded()) {
			this._init();
		} else {
			this._loadGoogleMapsAPI()
				.then(() => {
					this._init();
				})
				.catch(() => {
					console.error(`Couldn't load Google Maps: Please make sure API <script> is present on the page.`);
				});
		}
	}

	_init() {
		app.utilities.waitForVariable('google').then(() => {
			this._createMap();
			this._addMarkers();
			this._centerMap();
			this._addButtonCursorClasses();
		});
	}

	_parseStyles(styles) {
		if (!styles) {
			return false;
		}

		try {
			return JSON.parse(styles);
		} catch (err) {
			console.error('Google Map: Invalid Snazzy Styles array provided.');
			return false;
		}
	}

	_createMap() {
		const
			options = {
				center: new google.maps.LatLng(0, 0),
				zoom: this.options.zoom,
				scrollwheel: false
			};

		if (this.options.styles) {
			Object.assign(options, {
				styles: this._parseStyles(this.options.styles)
			});
		}

		this.map = new google.maps.Map(this.elements.container[0], options);
	}

	_addMarkers() {
		if (this.map) {
			this.map.markers = [];

			if (this.elements.markers.length) {
				this.elements.markers.forEach(el => {
					const marker = this._createMarker(el);

					if (marker) {
						this.map.markers.push(marker);
					}
				});
			}
		}
	}

	_createMarker(el) {
		const
			options = app.utilities.parseOptionsStringObject(el.getAttribute(`${this.options.markerOptionsAttribute}`)),
			content = el.getAttribute(`${this.options.markerContentAttribute}`);

		/**
		 * Marker
		 */
		const args = {
			position: new google.maps.LatLng(options.lat, options.lng),
			map: this.map
		};

		if (typeof options.img === 'string') {
			Object.assign(args, {
				icon: {
					url: options.img
				}
			});
		}

		if (typeof options.img === 'string' && options.width && options.height) {
			Object.assign(args.icon, {
				scaledSize: new google.maps.Size(options.width, options.height),
				origin: new google.maps.Point(0, 0), // origin
				anchor: new google.maps.Point(0, 0) // anchor
			});
		}

		const marker = new google.maps.Marker(args);

		/**
		 * Info Window (Content)
		 */
		if (typeof content === 'string' && content.length) {
			this._createInfoWindow(marker, content);
		}

		return marker;
	}

	_createInfoWindow(marker, content) {
		if (marker && content) {
			const infoWindow = new google.maps.InfoWindow({
				content
			});

			marker.addListener('click', () => {
				if (this.prevInfoWindow) {
					this.prevInfoWindow.close();
				}

				this.prevInfoWindow = infoWindow;

				infoWindow.open(this.map, marker);
			});
		}
	}

	_centerMap() {
		const bounds = new google.maps.LatLngBounds();

		this.map.markers.forEach((marker) => {
			if (marker.position && typeof marker.position.lat === 'function' && typeof marker.position.lng === 'function') {
				const
					lat = marker.position.lat(),
					lng = marker.position.lng(),
					newZoom = new google.maps.LatLng(lat, lng);

				bounds.extend(newZoom);
			}
		});

		// Center single marker
		if (this.map.markers.length === 1) {
			this.map.setCenter(bounds.getCenter());
			this.map.setZoom(this.options.zoom);
		} else { // Fit bounds to multiple markers
			this.map.fitBounds(bounds);
		}
	}

	_isGoogleMapsAPILoaded() {
		return typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined';
	}

	_loadGoogleMapsAPI() {
		return new Promise((resolve, reject) => {
			const googleMapScript = document.querySelector(this.options.googleMapAPIScriptSelector);

			if (googleMapScript) {
				let { id, src } = googleMapScript;

				app.assetsManager.load({
					type: 'script',
					id,
					src,
					preload: false,
				})
					.then(() => resolve(true))
					.catch(() => reject(false));
			} else {
				reject(false);
			}
		});
	}

	_addButtonCursorClasses() {
		google.maps.event.addListenerOnce(this.map, 'tilesloaded', () => {
			if (!!app.options.cursorFollower && !!app.options.cursorFollower.highlight && typeof app.options.cursorFollower.highlight.includeClass === 'string') {
				[...this.elements.container[0].querySelectorAll('[role="button"]')].forEach((el) => {
					el.classList.add(app.options.cursorFollower.highlight.includeClass);
				});
			}
		});
	}
}

class LocationPage {

  EARTH_LAND_COLOR = getCSSVariable('--LocationPage-earth-land-color');
  EARTH_SEA_COLOR = getCSSVariable('--LocationPage-earth-sea-color');

  MARKER_ACTIVE_CLASSNAME = 'LocationPage-marker--active';
  SCREEN_SIZE_CLASSNAME_PREFIX = 'LocationPage-screen--';

  /**
   * @type {[{ latitude: number, longitude: number }]}
   */
  locations = [];

  /**
   * @param {Earth}
   */
  earth;

  /**
   * @type {[Earth.Overlay]}
   */
  earthMarkers = [];

  /**
   * @type {number}
   */
  currentlyHighlightedEarthMarkerIndex;

  constructor(options) {
    if (this.validateConstructorParameters(options)) {
      const earthContainerElement = document.querySelector(options.earthContainerSelector);
      const locationBlockElements = document.querySelectorAll(options.locationBlocksSelector);

      this.waitForLibraryToLoad(() => {
        this.locations = this.extractEarthMarkerLocations(locationBlockElements);
        this.earth = this.renderEarth(earthContainerElement);
        this.earthMarkers = this.renderEarthMarkers(this.earth, this.locations);

        this.watchScrollToAnotherLocation(locationBlockElements, locationIndex => {
          const locationName = locationBlockElements[locationIndex].querySelector('.LocationPage-location-name').textContent;
          console.log('Scrolled to new location:', locationName);
          this.highlightLocationByIndex(locationIndex);
        });

        this.watchScreenSize();
      });
    }
  }

  validateConstructorParameters = (options = {}) => {
    const { earthContainerSelector, locationBlocksSelector } = options;
    const earthContainerElement = document.querySelector(earthContainerSelector);
    const locationBlockElements = document.querySelectorAll(locationBlocksSelector);

    let wrongSelectors = [];

    if (!earthContainerElement) {
      wrongSelectors.push('earthContainerSelector');
    }

    if (!locationBlockElements.length) {
      wrongSelectors.push('locationBlocksSelector');
    }

    if (wrongSelectors.length) {
      throw `\nElement(s) referred in ${wrongSelectors.join(', ')} param of "new LocationPage(params)" not found, must be a valid selector`;
    }

    for (let i = 0; i < locationBlockElements.length; i++) {
      const { latitude, longitude } = locationBlockElements[i].dataset;
      let wrongDataValues = [];

      if (isNaN(+latitude)) {
        wrongDataValues.push('data-latitude');
      }

      if (isNaN(+longitude)) {
        wrongDataValues.push('data-longitude');
      }

      if (wrongDataValues.length) {
        throw `\nWrong value of ${wrongDataValues.join(', ')} on "locationBlocksSelector"[${i}] element, must be a valid coordinate e.g. "52.520008"`;
      }
    }

    return true;
  };

  waitForLibraryToLoad = (callback) => {
    if (typeof Earth !== 'undefined') {
      callback();
    }
    else {
      window.addEventListener('earthjsload', callback);
    }
  };

  extractEarthMarkerLocations = (locationBlockElements) => {
    return [ ...locationBlockElements ].map(element => {
      const { latitude, longitude } = element.dataset;
      return { latitude, longitude };
    });
  };

  renderEarth = (earthContainerElement) => {
    return new Earth(earthContainerElement, {
      light: 'none',
      mapSeaColor: this.EARTH_SEA_COLOR,
      mapLandColor: this.EARTH_LAND_COLOR,
      zoom: 1.25,
    });
  };

  renderEarthMarkers = (earth, locations) => {
    const markers = [];
    const markerCode = `
    <div class="LocationPage-marker marker--active1">
      <i class="LocationPage-marker-x-axis"></i>
      <i class="LocationPage-marker-y-axis"></i>
      <i class="LocationPage-marker-point"></i>
    </div>`;

    locations.forEach(location => {
      const marker = earth.addOverlay({
        location: {
          lat: location.latitude,
          lng: location.longitude,
        },
        content : markerCode,
        depthScale : 0.3,
      });
      markers.push(marker);
    });
    return markers;
  };

  highlightLocationByIndex = (index) => {
    if (index !== this.currentlyHighlightedEarthMarkerIndex) {
      const { latitude, longitude } = this.locations[index];
      this.currentlyHighlightedEarthMarkerIndex = index;

      this.hideAllMarkers();

      this.earth.goTo({ lat: latitude, lng: longitude }, {
        relativeDuration: 100,
        complete: () => {
          this.showMarker(index);
        },
      });
    }
  };

  hideAllMarkers = () => {
    this.earthMarkers.forEach(marker => {
      const markerElement = marker.element.querySelector('.LocationPage-marker');
      markerElement.classList.remove(this.MARKER_ACTIVE_CLASSNAME);
    });
  };

  showMarker = (index) => {
    const markerContainer = this.earthMarkers[index].element;
    const markerElement = markerContainer.querySelector('.LocationPage-marker');
    markerElement.classList.add(this.MARKER_ACTIVE_CLASSNAME);
  };

  watchScreenSize = () => {
    const initialScreenSizeType = this.getScreenSizeType();
    const rootElement = document.documentElement;

    rootElement.classList.add(this.SCREEN_SIZE_CLASSNAME_PREFIX + initialScreenSizeType);
    this.screenSizeType = initialScreenSizeType;

    window.addEventListener('resize', () => {
      const currentScreenSizeType = this.getScreenSizeType();
      if (currentScreenSizeType !== this.screenSizeType) {
        rootElement.classList.remove(this.SCREEN_SIZE_CLASSNAME_PREFIX + this.screenSizeType);
        rootElement.classList.add(this.SCREEN_SIZE_CLASSNAME_PREFIX + currentScreenSizeType);
        this.screenSizeType = currentScreenSizeType;
      }
    });
  };

  getScreenSizeType = () => {
    const breakpoints = {
      'xs': 576,
      'sm': 768,
      'md': 992,
      'lg': 1200,
      'xl': Infinity,
    };
    for (let type in breakpoints) {
      if (window.innerWidth < breakpoints[type]) {
        return type;
      }
    }
  };

  watchScrollToAnotherLocation = (locationBlockElements, callback) => {
    const currentlyVisibleLocationBlocks = {};
    const observerOptions = {
      threshold: 0.95,
      root: null,
    };

    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const { locationBlockIndex } = entry.target.dataset;
        currentlyVisibleLocationBlocks[locationBlockIndex] = entry.isIntersecting;

        const mainlyVisibleLocationBlockIndex = this.getMainlyVisibleLocationBlock(currentlyVisibleLocationBlocks);
        if (typeof mainlyVisibleLocationBlockIndex !== 'undefined') {
          callback(mainlyVisibleLocationBlockIndex);
        }
      });
    }, observerOptions);

    locationBlockElements.forEach((locationBlockElement, index) => {
      locationBlockElement.dataset['locationBlockIndex'] = index;
      this.observer.observe(locationBlockElement);
    });
  };

  getMainlyVisibleLocationBlock = (currentlyVisibleLocationBlocks) => {
    const visibleLocationBlockIndexes = Object.keys(currentlyVisibleLocationBlocks)
      .filter(locationBlockIndex => {
        return currentlyVisibleLocationBlocks[locationBlockIndex];
      })
      .map(index => +index);

    // Selecting the central block on desktop
    let mainlyVisibleLocationBlockIndex = Math.floor((visibleLocationBlockIndexes.length - 1) / 2);

    if (this.screenSizeType === 'xs' || this.screenSizeType === 'sm') {
      // Selecting the bottom block on mobile
      mainlyVisibleLocationBlockIndex = visibleLocationBlockIndexes.length - 1;
    }
    return visibleLocationBlockIndexes[mainlyVisibleLocationBlockIndex];
  };
}

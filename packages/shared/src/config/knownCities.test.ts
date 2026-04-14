import { KNOWN_CITIES } from './knownCities';

describe('KNOWN_CITIES', () => {
  it('should have at least 50 entries', () => {
    const cityCount = Object.keys(KNOWN_CITIES).length;
    expect(cityCount).toBeGreaterThanOrEqual(50);
  });

  it('should contain expected popular city keys', () => {
    const expectedKeys = [
      'paris',
      'london',
      'tokyo',
      'new york',
      'nyc',
      'los angeles',
      'la',
      'san francisco',
      'chicago',
      'miami',
      'las vegas',
      'vegas',
      'washington dc',
      'dc',
      'barcelona',
      'rome',
      'amsterdam',
      'dubai',
      'sydney',
      'bali',
      'rio de janeiro',
      'rio',
    ];

    for (const key of expectedKeys) {
      expect(KNOWN_CITIES).toHaveProperty(key);
    }
  });

  it('should have all entries with lat/lng as strings', () => {
    for (const [name, coords] of Object.entries(KNOWN_CITIES)) {
      expect(typeof coords.lat, `${name} lat should be string`).toBe('string');
      expect(typeof coords.lng, `${name} lng should be string`).toBe('string');

      // Validate that lat/lng are valid numbers in string format
      const latNum = parseFloat(coords.lat);
      const lngNum = parseFloat(coords.lng);

      expect(!isNaN(latNum), `${name} lat should be a valid number`).toBe(true);
      expect(!isNaN(lngNum), `${name} lng should be a valid number`).toBe(true);

      // Rough bounds check (lat: -90 to 90, lng: -180 to 180)
      expect(latNum).toBeGreaterThanOrEqual(-90);
      expect(latNum).toBeLessThanOrEqual(90);
      expect(lngNum).toBeGreaterThanOrEqual(-180);
      expect(lngNum).toBeLessThanOrEqual(180);
    }
  });

  it('should have aliases pointing to same coordinates as full names', () => {
    // NYC should match New York
    expect(KNOWN_CITIES.nyc).toEqual(KNOWN_CITIES['new york']);

    // LA should match Los Angeles
    expect(KNOWN_CITIES.la).toEqual(KNOWN_CITIES['los angeles']);

    // Vegas should match Las Vegas
    expect(KNOWN_CITIES.vegas).toEqual(KNOWN_CITIES['las vegas']);

    // DC should match Washington DC
    expect(KNOWN_CITIES.dc).toEqual(KNOWN_CITIES['washington dc']);

    // Rio should match Rio de Janeiro
    expect(KNOWN_CITIES.rio).toEqual(KNOWN_CITIES['rio de janeiro']);
  });
});

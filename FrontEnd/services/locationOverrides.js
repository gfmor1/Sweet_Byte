// Simulated locations kept in this browser only (no backend support yet).
//  - the customer's own delivery location ("You" pin)
//  - restaurant locations, when PATCH /api/restaurants/{id}/location is not available
// Every read/write is wrapped: storage can be blocked or empty.

const CUSTOMER_KEY = "sweetbyte.customerLocation";
const RESTAURANT_KEY = "sweetbyte.restaurantLocations";

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: the location just will not persist
  }
}

const isValid = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180;

// ---- customer ("You") ----
export function getCustomerLocation() {
  const saved = read(CUSTOMER_KEY, null);
  return saved && isValid(saved.latitude, saved.longitude) ? saved : null;
}

export function setCustomerLocation(latitude, longitude) {
  if (!isValid(latitude, longitude)) throw new Error("Invalid location.");
  write(CUSTOMER_KEY, { latitude, longitude });
}

export function clearCustomerLocation() {
  try {
    window.localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    // ignore
  }
}

// ---- restaurants ----
export function getRestaurantOverrides() {
  return read(RESTAURANT_KEY, {});
}

export function setRestaurantOverride(restaurantId, latitude, longitude) {
  if (!isValid(latitude, longitude)) throw new Error("Invalid location.");
  write(RESTAURANT_KEY, {
    ...getRestaurantOverrides(),
    [String(restaurantId)]: { latitude, longitude },
  });
}

// Returns the list with any locally saved locations applied.
export function applyRestaurantOverrides(restaurants) {
  const overrides = getRestaurantOverrides();
  return restaurants.map((restaurant) => {
    const override = overrides[String(restaurant.id)];
    return override ? { ...restaurant, ...override } : restaurant;
  });
}

// Once the server has the location, drop the browser copy so it no longer hides the real one.
export function clearRestaurantOverride(restaurantId) {
  const overrides = { ...getRestaurantOverrides() };
  if (!(String(restaurantId) in overrides)) return;
  delete overrides[String(restaurantId)];
  write(RESTAURANT_KEY, overrides);
}

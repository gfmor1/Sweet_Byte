import { apiRequest } from "./apiClient";

// Statuses are kept as the backend enum values ("OPEN", "SOLD_OUT")
function toMenuItem(item) {
  return {
    id: item.menuItemID,
    name: item.name,
    price: item.price,
    status: item.status
  };
}

function toRestaurant(restaurant) {
  return {
    id: restaurant.restaurantID,
    name: restaurant.name,
    status: restaurant.status,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    queueSize: restaurant.queueSize
  };
}

export async function getRestaurants() {
  const restaurants = await apiRequest("/api/restaurants");
  return restaurants.map(toRestaurant);
}

export async function getRestaurant(restaurantId) {
  return toRestaurant(await apiRequest(`/api/restaurants/${restaurantId}`));
}

export async function changeRestaurantStatus(restaurantId, status) {
  const restaurant = await apiRequest(`/api/restaurants/${restaurantId}/status`, {
    method: "PATCH",
    body: { status }
  });
  return toRestaurant(restaurant);
}

export async function getMenu(restaurantId) {
  const menu = await apiRequest(`/api/restaurants/${restaurantId}/menu`);
  return menu.map(toMenuItem);
}

export async function addMenuItem(restaurantId, name, price) {
  const item = await apiRequest(`/api/restaurants/${restaurantId}/menu`, {
    method: "POST",
    body: { name, price }
  });
  return toMenuItem(item);
}

export async function updateMenuItem(restaurantId, itemId, name, price) {
  const item = await apiRequest(`/api/restaurants/${restaurantId}/menu/${itemId}`, {
    method: "PUT",
    body: { name, price }
  });
  return toMenuItem(item);
}

export async function setMenuItemStatus(restaurantId, itemId, status) {
  const action = status === "SOLD_OUT" ? "sold-out" : "available";
  const item = await apiRequest(
    `/api/restaurants/${restaurantId}/menu/${itemId}/${action}`,
    { method: "PATCH" }
  );
  return toMenuItem(item);
}

export async function removeMenuItem(restaurantId, itemId) {
  const menu = await apiRequest(`/api/restaurants/${restaurantId}/menu/${itemId}`, {
    method: "DELETE"
  });
  return menu.map(toMenuItem);
}

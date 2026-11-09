import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";
import { getRestaurantsWithQueues } from "./restaurantApi";

// All couriers with position and status (OFFLINE ones included; the map hides them)
export function getCouriers() {
  return useMocks ? mockStore.getCouriers() : apiRequest("/api/dispatch/couriers");
}

// READY orders still waiting for an idle courier, oldest first
export function getDispatchQueue() {
  return useMocks ? mockStore.getDispatchQueue() : apiRequest("/api/dispatch/queue");
}

// Restaurants with coordinates (and queueSize when known) for the city map
export function getMapRestaurants() {
  return useMocks ? mockStore.getRestaurants() : getRestaurantsWithQueues();
}

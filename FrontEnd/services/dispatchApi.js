import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";
import { getRestaurantsWithQueues } from "./restaurantApi";

// All couriers with position and status (OFFLINE ones included; the map hides them)
export function getCouriers() {
  return useMocks ? mockStore.getCouriers() : apiRequest("/api/dispatch/couriers");
}

// READY orders still waiting for an idle courier, oldest first
// Backend returns orders; waitingSeconds is derived from readyAt.
export async function getDispatchQueue() {
  if (useMocks) return mockStore.getDispatchQueue();
  const orders = await apiRequest("/api/dispatch/queue");
  const now = Date.now();
  return (orders || []).map((order) => ({
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    readyAt: order.readyAt,
    waitingSeconds: order.readyAt
      ? Math.max(0, Math.round((now - Date.parse(order.readyAt)) / 1000))
      : undefined,
  }));
}

// Restaurants with coordinates (and queueSize when known) for the city map
export function getMapRestaurants() {
  return useMocks ? mockStore.getRestaurants() : getRestaurantsWithQueues();
}

import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";

// The acting courier is always the authenticated user; no courier id is sent.
// Order commands take the orderId of the current offer/delivery (from getOffer()).

const BASE = "/api/couriers/me";

function orderPath(orderId, action) {
  if (orderId == null) throw new Error("There is no current order.");
  return `${BASE}/orders/${encodeURIComponent(orderId)}/${action}`;
}

// Backend returns the order, not the courier; resolve to null so callers re-fetch the courier.
function orderCommand(orderId, action) {
  return apiRequest(orderPath(orderId, action), { method: "POST" }).then(() => null);
}

function toItems(lines) {
  return Array.isArray(lines)
    ? lines.map((line) => ({ id: line.menuItemId, name: line.name, quantity: line.quantity }))
    : [];
}

// Pending offer (DeliveryOfferResponse) -> the view model the courier UI uses
function fromPendingOffer(offer) {
  return {
    orderId: offer.orderId,
    orderStatus: "READY",
    accepted: false,
    restaurantName: offer.restaurantName,
    restaurantLatitude: offer.restaurantLatitude,
    restaurantLongitude: offer.restaurantLongitude,
    dropoffLatitude: offer.customerLatitude,
    dropoffLongitude: offer.customerLongitude,
    deliveryAddress: offer.deliveryAddress,
    items: toItems(offer.items),
    courierStatus: "IDLE",
  };
}

// Held order (ActiveDeliveryResponse) -> same view model
function fromActiveDelivery(delivery) {
  return {
    orderId: delivery.orderId,
    orderStatus: delivery.status,
    accepted: true,
    restaurantId: delivery.restaurantId,
    restaurantName: delivery.restaurantName,
    restaurantLatitude: delivery.restaurantLatitude,
    restaurantLongitude: delivery.restaurantLongitude,
    dropoffLatitude: delivery.customerLatitude,
    dropoffLongitude: delivery.customerLongitude,
    deliveryAddress: delivery.deliveryAddress,
    items: toItems(delivery.items),
    courierStatus: delivery.status === "PICKED_UP" ? "CARRYING" : "ASSIGNED",
  };
}

export function getMe() {
  return useMocks ? mockStore.courierGetMe() : apiRequest(BASE);
}

export function goOnDuty() {
  return useMocks ? mockStore.courierGoOnDuty() : apiRequest(`${BASE}/on-duty`, { method: "POST" });
}

export function goOffDuty() {
  return useMocks ? mockStore.courierGoOffDuty() : apiRequest(`${BASE}/off-duty`, { method: "POST" });
}

// Current offered/assigned/carried order, or null
export async function getOffer() {
  if (useMocks) return mockStore.courierGetOffer();
  const [pending, active] = await Promise.all([
    apiRequest(`${BASE}/offer`),
    apiRequest(`${BASE}/delivery`),
  ]);
  if (active) return fromActiveDelivery(active);
  if (pending) return fromPendingOffer(pending);
  return null;
}

export function acceptOffer(orderId) {
  return useMocks ? mockStore.courierAcceptOffer() : orderCommand(orderId, "accept");
}

export function declineOffer(orderId) {
  return useMocks ? mockStore.courierDeclineOffer() : orderCommand(orderId, "decline");
}

export function confirmPickup(orderId) {
  return useMocks ? mockStore.courierConfirmPickup() : orderCommand(orderId, "pickup");
}

export function confirmDelivery(orderId) {
  return useMocks ? mockStore.courierConfirmDelivery() : orderCommand(orderId, "deliver");
}

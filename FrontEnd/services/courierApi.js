import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";

// The acting courier is always the authenticated user; no courier id is sent.

export function getMe() {
  return useMocks ? mockStore.courierGetMe() : apiRequest("/api/courier/me");
}

export function goOnDuty() {
  return useMocks ? mockStore.courierGoOnDuty() : apiRequest("/api/courier/duty/on", { method: "POST" });
}

export function goOffDuty() {
  return useMocks ? mockStore.courierGoOffDuty() : apiRequest("/api/courier/duty/off", { method: "POST" });
}

// Current offered/assigned/carried order, or null
export function getOffer() {
  return useMocks ? mockStore.courierGetOffer() : apiRequest("/api/courier/offer");
}

export function acceptOffer() {
  return useMocks
    ? mockStore.courierAcceptOffer()
    : apiRequest("/api/courier/offer/accept", { method: "POST" });
}

export function declineOffer() {
  return useMocks
    ? mockStore.courierDeclineOffer()
    : apiRequest("/api/courier/offer/decline", { method: "POST" });
}

export function confirmPickup() {
  return useMocks
    ? mockStore.courierConfirmPickup()
    : apiRequest("/api/courier/pickup", { method: "POST" });
}

export function confirmDelivery() {
  return useMocks
    ? mockStore.courierConfirmDelivery()
    : apiRequest("/api/courier/delivery", { method: "POST" });
}

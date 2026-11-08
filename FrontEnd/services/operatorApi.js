import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";

export const operatorEnabled =
  useMocks || process.env.NEXT_PUBLIC_ENABLE_OPERATOR === "true";

export async function getOperatorDashboard() {
  if (useMocks) return mockStore.getOperatorDashboard();
  return apiRequest("/api/operator/dashboard");
}

export async function pauseRestaurant(restaurantId) {
  if (useMocks) return mockStore.pauseRestaurant(restaurantId);
  return apiRequest(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/pause`,
    { method: "PATCH" }
  );
}

export async function reopenRestaurant(restaurantId) {
  if (useMocks) return mockStore.reopenRestaurant(restaurantId);
  return apiRequest(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/reopen`,
    { method: "PATCH" }
  );
}

export async function reassignOrder(orderId) {
  if (useMocks) return mockStore.reassignOrder(orderId);
  return apiRequest(
    `/api/operator/orders/${encodeURIComponent(orderId)}/reassign`,
    { method: "POST" }
  );
}

export async function refundOrder(orderId) {
  if (useMocks) return mockStore.refundOrder(orderId);
  return apiRequest(
    `/api/operator/orders/${encodeURIComponent(orderId)}/refund`,
    { method: "POST" }
  );
}

// All ledger entries; refunds are separate REFUND entries, charges are never edited
export async function getLedger() {
  if (useMocks) return mockStore.getLedger();
  return apiRequest("/api/ledger");
}

export async function resetSystem() {
  if (useMocks) return mockStore.resetSystem();
  return apiRequest("/api/operator/reset", {
    method: "POST",
  });
}

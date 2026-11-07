import { apiRequest } from "./apiClient";

export const operatorEnabled =
  process.env.NEXT_PUBLIC_ENABLE_OPERATOR === "true";

export async function getOperatorDashboard() {
  return apiRequest("/api/operator/dashboard");
}

export async function pauseRestaurant(restaurantId) {
  return apiRequest(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/pause`,
    { method: "PATCH" }
  );
}

export async function reopenRestaurant(restaurantId) {
  return apiRequest(
    `/api/restaurants/${encodeURIComponent(restaurantId)}/reopen`,
    { method: "PATCH" }
  );
}

export async function reassignOrder(orderId) {
  return apiRequest(
    `/api/operator/orders/${encodeURIComponent(orderId)}/reassign`,
    { method: "POST" }
  );
}

export async function refundOrder(orderId) {
  return apiRequest(
    `/api/operator/orders/${encodeURIComponent(orderId)}/refund`,
    { method: "POST" }
  );
}

export async function resetSystem() {
  return apiRequest("/api/operator/reset", {
    method: "POST",
  });
}
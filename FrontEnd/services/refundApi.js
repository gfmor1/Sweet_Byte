import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";
import { getMyOrders } from "./orderApi";

// Refund requests: a customer sends one, an operator accepts or declines it (UC-PRC-05/06/07).
// The /api/refund-requests paths are not built on the backend yet; confirm them when they land.

// In mock mode these are sample orders: the customer's real orders are unknown to the mock store.
export async function getRefundableOrders() {
  if (useMocks) return mockStore.getRefundableOrders();
  const orders = await getMyOrders();
  return orders.filter((order) => order.status === "DELIVERED");
}

// The backend must scope this by role: own requests for a customer or restaurant, all for an operator.
export function getRefundRequests() {
  return useMocks ? mockStore.getRefundRequests() : apiRequest("/api/refund-requests");
}

export function submitRefundRequest({ orderId, reason, proof }) {
  return useMocks
    ? mockStore.submitRefundRequest({ orderId, reason, proof })
    : apiRequest("/api/refund-requests", { method: "POST", body: { orderId, reason, proof } });
}

export function acceptRefundRequest(requestId) {
  return useMocks
    ? mockStore.acceptRefundRequest(requestId)
    : apiRequest(`/api/refund-requests/${encodeURIComponent(requestId)}/accept`, { method: "POST" });
}

export function declineRefundRequest(requestId) {
  return useMocks
    ? mockStore.declineRefundRequest(requestId)
    : apiRequest(`/api/refund-requests/${encodeURIComponent(requestId)}/decline`, { method: "POST" });
}

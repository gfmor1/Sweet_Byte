import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";
import { getMyOrders } from "./orderApi";
import { getHistory } from "./pricingApi";

// Refund requests: a customer sends one, an operator accepts or declines it (UC-PRC-05/06/07).
// Backend: RefundRequestController. Accepting writes a REFUND entry in the ledger.

// Backend verdict names -> the names the pages use.
const STATUS_FROM_BACKEND = { PENDING: "PENDING", APPROVED: "ACCEPTED", REJECTED: "DECLINED" };

// Backend RefundRequestResponse -> the shape the pages use.
function toRefundRequest(request) {
  return {
    id: request.requestId,
    orderId: request.orderId,
    restaurantId: request.restaurantId,
    reason: request.reason, // the customer's proof text (see submitRefundRequest)
    status: STATUS_FROM_BACKEND[request.status] || request.status,
    requestedAt: request.requestedAt,
    decidedAt: request.decidedAt,
    operatorNote: request.operatorNote,
  };
}

// In mock mode these are sample orders: the customer's real orders are unknown to the mock store.
export async function getRefundableOrders() {
  if (useMocks) return mockStore.getRefundableOrders();
  const orders = await getMyOrders();
  return orders.filter((order) => order.status === "DELIVERED");
}

// Scoped by the backend: own requests for a customer or restaurant, all for an operator.
export async function getRefundRequests() {
  if (useMocks) return mockStore.getRefundRequests();
  const requests = await apiRequest("/api/refund-requests");
  return requests.map(toRefundRequest);
}

// The backend stores one reason text, so the customer's proof is sent as the reason.
export async function submitRefundRequest({ orderId, reason, proof }) {
  if (useMocks) return mockStore.submitRefundRequest({ orderId, reason, proof });
  const request = await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/refund-request`, {
    method: "POST",
    body: { reason: proof },
  });
  return toRefundRequest(request);
}

export async function acceptRefundRequest(requestId) {
  if (useMocks) return mockStore.acceptRefundRequest(requestId);
  const request = await apiRequest(`/api/refund-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
  });
  return toRefundRequest(request);
}

// The note is required: it tells the customer why the refund was declined.
export async function declineRefundRequest(requestId, note) {
  if (useMocks) return mockStore.declineRefundRequest(requestId, note);
  const request = await apiRequest(`/api/refund-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    body: { note },
  });
  return toRefundRequest(request);
}

// REFUND entries of the ledger visible to this user, keyed by order id.
export async function getRefundEntriesByOrder() {
  const entries = await getHistory();
  return Object.fromEntries(
    entries.filter((entry) => entry.type === "REFUND").map((entry) => [String(entry.orderId), entry])
  );
}

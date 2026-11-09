import { apiRequest } from "./apiClient";
import { mockSessionRole } from "./authApi";
import * as mockStore from "./mocks/mockStore";

// Mock data only serves the mock courier/operator sessions: customers and owners use real orders.

export function toLedgerEntry(entry) {
  return {
    entryId: entry.id,
    orderId: entry.orderId,
    type: entry.type,
    finalState: entry.finalStatus,
    recordedAt: entry.recordedAt,
    amount: entry.amount,
  };
}

export async function getOrderSummary(orderId) {
  if (mockSessionRole()) return mockStore.getOrderSummary(orderId);

  const summary = await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/summary`);
  return {
    orderId: summary.orderId,
    status: summary.status,
    deliveredAt: summary.timestamps?.DELIVERED,
    fare: summary.fare,
  };
}

export async function getHistory() {
  const role = mockSessionRole();
  if (role) return mockStore.getHistory(role);

  // The backend scopes results using the authenticated session.
  const entries = await apiRequest("/api/ledger");
  return entries.map(toLedgerEntry);
}

// Fare of an existing order
export async function getFare(orderId) {
  if (mockSessionRole()) return mockStore.getOrderFare(orderId);
  return apiRequest(`/api/orders/${encodeURIComponent(orderId)}/fare`);
}

export async function getPricingConfig() {
  if (mockSessionRole()) return mockStore.getPricingConfig();
  return apiRequest("/api/pricing/config");
}

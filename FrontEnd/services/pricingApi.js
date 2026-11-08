import { apiRequest } from "./apiClient";
import { useMocks, PRICING_CONFIG, calculateFare } from "./config";
import * as mockStore from "./mocks/mockStore";

export const pricingEnabled =
  useMocks || process.env.NEXT_PUBLIC_ENABLE_PRC === "true";

export async function getOrderSummary(orderId) {
  if (useMocks) return mockStore.getOrderSummary(orderId);

  if (!pricingEnabled) {
    throw new Error("Pricing integration is not enabled yet.");
  }

  return apiRequest(
    `/api/pricing/orders/${encodeURIComponent(orderId)}/summary`
  );
}

export async function getHistory() {
  if (useMocks) return mockStore.getHistory();

  if (!pricingEnabled) {
    throw new Error("Pricing integration is not enabled yet.");
  }

  // The backend must scope results using the authenticated session.
  return apiRequest("/api/pricing/history");
}

// Fare of an existing order
export async function getFare(orderId) {
  if (useMocks) return mockStore.getOrderFare(orderId);
  return apiRequest(`/api/orders/${encodeURIComponent(orderId)}/fare`);
}

export async function getPricingConfig() {
  if (useMocks) return mockStore.getPricingConfig();
  return apiRequest("/api/pricing/config");
}

// Client-side preview of the fare for a cart subtotal (same formula as the backend)
export function previewFare(subtotal) {
  return calculateFare(subtotal, PRICING_CONFIG);
}

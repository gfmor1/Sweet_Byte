import { apiRequest } from "./apiClient";

export const pricingEnabled =
  process.env.NEXT_PUBLIC_ENABLE_PRC === "true";

export async function getOrderSummary(orderId) {
  if (!pricingEnabled) {
    throw new Error("Pricing integration is not enabled yet.");
  }

  return apiRequest(
    `/api/pricing/orders/${encodeURIComponent(orderId)}/summary`
  );
}

export async function getHistory() {
  if (!pricingEnabled) {
    throw new Error("Pricing integration is not enabled yet.");
  }

  // The backend must scope results using the authenticated session.
  return apiRequest("/api/pricing/history");
}
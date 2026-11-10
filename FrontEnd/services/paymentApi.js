import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";

// Off against the real backend until its payment endpoints exist (set NEXT_PUBLIC_ENABLE_PAYMENTS=true).
export const paymentsEnabled = useMocks || process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true";

// Payment data layer. UI code imports only this file. Each function serves the mock store when
// NEXT_PUBLIC_USE_MOCKS=true, otherwise calls the endpoint noted beside it (backend not built yet).
//
// Payment shape: { paymentId, orderId|null, customerId, customerName, method, brand, last4,
//   amount, currency, status: PAID|FAILED|REFUNDED, createdAt, refundedAt|null, failureReason|null }
// Card shape (never the full number/CVV): { brand, last4, expMonth, expYear, holder }
// Couriers must never receive any of this.

// Customer: own history. GET /api/payments/me
export async function getMyPayments(user) {
  if (useMocks) return mockStore.getMyPayments(customerKey(user));
  return apiRequest("/api/payments/me");
}

// Operator: every payment. GET /api/payments
export async function getAllPayments() {
  if (useMocks) return mockStore.getAllPayments();
  return apiRequest("/api/payments");
}

// Customer: saved card or null. GET /api/payments/card
export async function getSavedCard(user) {
  if (useMocks) return mockStore.getSavedCard(customerKey(user));
  return apiRequest("/api/payments/card");
}

// PUT /api/payments/card  body: card fields (backend/payment provider tokenises it)
export async function saveCard(user, card) {
  if (useMocks) return mockStore.saveCard(customerKey(user), card);
  return apiRequest("/api/payments/card", { method: "PUT", body: card });
}

// DELETE /api/payments/card
export async function removeCard(user) {
  if (useMocks) return mockStore.removeCard(customerKey(user));
  return apiRequest("/api/payments/card", { method: "DELETE" });
}

// Customer: charge the saved card; rejects (402) when declined. POST /api/payments
export async function chargeOrder(user, { amount }) {
  if (useMocks) return mockStore.chargeOrder(customerKey(user), user?.name, { amount });
  return apiRequest("/api/payments", { method: "POST", body: { amount } });
}

// Link a payment to the order created right after it. PATCH /api/payments/{id}/order
export async function attachPaymentToOrder(paymentId, orderId) {
  if (useMocks) return mockStore.attachPaymentToOrder(paymentId, orderId);
  return apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/order`, {
    method: "PATCH",
    body: { orderId },
  });
}

// Operator. POST /api/payments/{id}/refund
export async function refundPayment(paymentId) {
  if (useMocks) return mockStore.refundPayment(paymentId);
  return apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST" });
}

// Totals are derived client-side so the backend only needs the list endpoint.
export function summarizePayments(payments) {
  const sum = { paid: 0, refunded: 0, failed: 0, paidCount: 0, refundedCount: 0, failedCount: 0 };
  for (const p of payments) {
    const amount = Number(p.amount) || 0;
    if (p.status === "PAID") {
      sum.paid += amount;
      sum.paidCount += 1;
    } else if (p.status === "REFUNDED") {
      sum.refunded += amount;
      sum.refundedCount += 1;
    } else if (p.status === "FAILED") {
      sum.failedCount += 1;
    }
  }
  sum.net = sum.paid;
  return sum;
}

function customerKey(user) {
  return String(user?.id ?? user?.email ?? "customer");
}

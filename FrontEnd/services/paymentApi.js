import { apiRequest } from "./apiClient";
import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";
import { refundOrder } from "./operatorApi";

// Payments (mock charge, no real provider) are recorded by the backend:
//   - placing an order sends the saved card; the backend stores it on the order and writes
//     a PAYMENT billing record (POST /api/orders)
//   - GET /api/payments lists them (customer: own, operator: all), with REFUNDED status once
//     billing has a REFUND record (cancel, reject, approved refund request, operator refund)
// Only the saved card stays in this page's memory (mock store): brand/last4/holder/expiry, never the number.
export const paymentsEnabled = true;

// Payment shape: { paymentId, orderId|null, customerId, customerName, method, brand, last4,
//   amount, currency, status: PAID|FAILED|REFUNDED, createdAt, refundedAt|null, failureReason|null }
// Card shape (never the full number/CVV): { brand, last4, expMonth, expYear, holder }
// Couriers must never receive any of this.

// The mock store ships sample payments for mock mode; hide them when using real orders.
const DEMO_CUSTOMER = "demo";
const realOnly = (payments) =>
  useMocks ? payments : payments.filter((p) => p.customerId !== DEMO_CUSTOMER);

// Customer: own history (backend scopes by the logged-in user)
export async function getMyPayments(user) {
  if (useMocks) return realOnly(await mockStore.getMyPayments(customerKey(user)));
  return apiRequest("/api/payments");
}

// Operator: every payment (backend scopes by role)
export async function getAllPayments() {
  if (useMocks) return realOnly(await mockStore.getAllPayments());
  return apiRequest("/api/payments");
}

// Customer: saved card or null
export function getSavedCard(user) {
  return mockStore.getSavedCard(customerKey(user));
}

// Every field is required and checked: number, name, expiry month/year, CVV.
export function saveCard(user, card) {
  return mockStore.saveCard(customerKey(user), card);
}

export function removeCard(user) {
  return mockStore.removeCard(customerKey(user));
}

// Operator: refund a payment = refund its order through the backend Automatic Credit Refund
// (billing REFUND record + ledger). Takes the payment row, since the refund is per order.
export function refundPayment(payment) {
  if (useMocks) return mockStore.refundPayment(payment.paymentId);
  return refundOrder(payment.orderId);
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

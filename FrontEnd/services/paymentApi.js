import { useMocks } from "./config";
import * as mockStore from "./mocks/mockStore";

// Payments are a front-end-only simulation for the demo: always on, no backend, nothing saved.
// Cards and payments live in this page's memory (the mock store) and disappear on reload.
// Billing and the ledger (backend) stay the source of truth for what an order cost.
export const paymentsEnabled = true;

// Payment shape: { paymentId, orderId|null, customerId, customerName, method, brand, last4,
//   amount, currency, status: PAID|FAILED|REFUNDED, createdAt, refundedAt|null, failureReason|null }
// Card shape (never the full number/CVV): { brand, last4, expMonth, expYear, holder }
// Couriers must never receive any of this.

// The mock store ships sample payments for mock mode; hide them when using real orders.
const DEMO_CUSTOMER = "demo";
const realOnly = (payments) =>
  useMocks ? payments : payments.filter((p) => p.customerId !== DEMO_CUSTOMER);

// Customer: own history
export async function getMyPayments(user) {
  return realOnly(await mockStore.getMyPayments(customerKey(user)));
}

// Operator: every payment made in this browser session
export async function getAllPayments() {
  return realOnly(await mockStore.getAllPayments());
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

// Customer: charge the saved card; always approved, rejects (402) only when there is no card.
export function chargeOrder(user, { amount }) {
  return mockStore.chargeOrder(customerKey(user), user?.name, { amount });
}

// Link a payment to the order created right after it.
export function attachPaymentToOrder(paymentId, orderId) {
  return mockStore.attachPaymentToOrder(paymentId, orderId);
}

// Operator: mark a payment refunded (display only; the real refund is the refund request flow).
export function refundPayment(paymentId) {
  return mockStore.refundPayment(paymentId);
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

// When true, courier/dispatch/operator/pricing calls are served by the in-memory mock store.
export const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// Mirrors the backend pricing properties (GET /api/pricing/config).
export const PRICING_CONFIG = {
  currency: "CAD",
  deliveryFee: 2.99,
  serviceFee: 1.5,
  smallOrderThreshold: 15.0,
  smallOrderSurcharge: 1.5,
};

const roundCents = (value) => Math.round(value * 100) / 100;

// Fare breakdown for an items subtotal: subtotal + delivery + service (+ surcharge below threshold).
export function calculateFare(subtotal, config = PRICING_CONFIG) {
  const smallOrderSurcharge = subtotal < config.smallOrderThreshold ? config.smallOrderSurcharge : 0;
  return {
    subtotal: roundCents(subtotal),
    deliveryFee: config.deliveryFee,
    serviceFee: config.serviceFee,
    smallOrderSurcharge,
    total: roundCents(subtotal + config.deliveryFee + config.serviceFee + smallOrderSurcharge),
    currency: config.currency,
  };
}

// A delivered order can be the subject of a refund request for this long (UC-PRC-05).
export const REFUND_WINDOW_MS = 90 * 60 * 1000;

// Only delivered orders can be refunded: a picked-up order is always delivered (no stolen/lost orders).
export const REFUND_REASONS = {
  UNSATISFIED: "Unsatisfied with order",
};

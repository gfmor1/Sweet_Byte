// Single source of truth for "who may do what, and when" (R-DASH-04/05).
// ctx fields used (all optional unless a rule needs them):
//   restaurantStatus, cartSize, orderStatus, courierStatus, offerAccepted, stalled,
//   deliveredAt, refundReason, hasPendingRequest, requestStatus

import { REFUND_WINDOW_MS } from "./config";

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  RESTAURANT_OWNER: "RESTAURANT_OWNER",
  COURIER: "COURIER",
  OPERATOR: "OPERATOR",
};

const { CUSTOMER, RESTAURANT_OWNER, COURIER, OPERATOR } = ROLES;

// Each rule: allowed roles, and an optional state check returning a reason string when blocked.
const RULES = {
  browseMenu: { roles: [CUSTOMER] },
  placeOrder: {
    roles: [CUSTOMER],
    check: (ctx) =>
      ctx.restaurantStatus !== "OPEN"
        ? "The restaurant is not open."
        : !(ctx.cartSize > 0)
          ? "Add at least one item to the cart."
          : null,
  },
  cancelOrder: {
    roles: [CUSTOMER],
    check: (ctx) => (ctx.orderStatus !== "PLACED" ? "Only a placed order can be cancelled." : null),
  },
  requestRefund: {
    roles: [CUSTOMER],
    check: (ctx) => {
      if (ctx.hasPendingRequest) return "A refund request is already pending for this order.";
      if (ctx.orderStatus !== "DELIVERED") return "This order is not eligible for a refund.";
      return Date.now() - Date.parse(ctx.deliveredAt) < REFUND_WINDOW_MS
        ? null
        : "The 1.5 hour refund window has passed.";
    },
  },

  acceptOrder: {
    roles: [RESTAURANT_OWNER],
    check: (ctx) => (ctx.orderStatus !== "PLACED" ? "Only a placed order can be accepted." : null),
  },
  rejectOrder: {
    roles: [RESTAURANT_OWNER],
    check: (ctx) => (ctx.orderStatus !== "PLACED" ? "Only a placed order can be rejected." : null),
  },
  startPreparing: {
    roles: [RESTAURANT_OWNER],
    check: (ctx) => (ctx.orderStatus !== "ACCEPTED" ? "The order must be accepted first." : null),
  },
  markReady: {
    roles: [RESTAURANT_OWNER],
    check: (ctx) => (ctx.orderStatus !== "PREPARING" ? "The order must be in preparation." : null),
  },
  editMenu: { roles: [RESTAURANT_OWNER] },

  pauseRestaurant: {
    roles: [RESTAURANT_OWNER, OPERATOR],
    check: (ctx) => (ctx.restaurantStatus !== "OPEN" ? "Only an open restaurant can be paused." : null),
  },
  reopenRestaurant: {
    roles: [RESTAURANT_OWNER, OPERATOR],
    check: (ctx) => (ctx.restaurantStatus !== "PAUSED" ? "Only a paused restaurant can be reopened." : null),
  },

  goOnDuty: {
    roles: [COURIER],
    check: (ctx) => (ctx.courierStatus !== "OFFLINE" ? "You are already on duty." : null),
  },
  goOffDuty: {
    roles: [COURIER],
    check: (ctx) =>
      ctx.courierStatus === "OFFLINE"
        ? "You are already off duty."
        : ctx.courierStatus === "CARRYING"
          ? "You cannot go off duty while carrying an order."
          : null,
  },
  acceptOffer: {
    roles: [COURIER],
    check: (ctx) =>
      ctx.offerAccepted !== false ? "There is no pending offer to accept." : null,
  },
  declineOffer: {
    roles: [COURIER],
    check: (ctx) =>
      ctx.offerAccepted !== false ? "There is no pending offer to decline." : null,
  },
  confirmPickup: {
    roles: [COURIER],
    check: (ctx) =>
      ctx.courierStatus !== "ASSIGNED"
        ? "You have no assigned order."
        : ctx.offerAccepted === false
          ? "Accept the offer first."
          : ctx.orderStatus !== "READY"
            ? "The order is not ready for pickup yet."
            : null,
  },
  confirmDelivery: {
    roles: [COURIER],
    check: (ctx) =>
      ctx.courierStatus !== "CARRYING" || ctx.orderStatus !== "PICKED_UP"
        ? "You must be carrying a picked-up order."
        : null,
  },

  reassignOrder: {
    roles: [OPERATOR],
    check: (ctx) => (ctx.stalled !== true ? "Only stalled orders can be reassigned." : null),
  },
  refundOrder: {
    roles: [OPERATOR],
    check: (ctx) => (ctx.orderStatus !== "DELIVERED" ? "Only delivered orders can be refunded." : null),
  },
  acceptRefund: {
    roles: [OPERATOR],
    check: (ctx) => (ctx.requestStatus !== "PENDING" ? "This request was already decided." : null),
  },
  declineRefund: {
    roles: [OPERATOR],
    check: (ctx) => (ctx.requestStatus !== "PENDING" ? "This request was already decided." : null),
  },
  reset: { roles: [OPERATOR] },
  viewAllOrders: { roles: [OPERATOR] },
};

// Why the command is blocked, or null when it is allowed.
export function explain(role, command, ctx = {}) {
  const rule = RULES[command];
  if (!rule || !rule.roles.includes(role)) return "Not available for your role.";
  return rule.check ? rule.check(ctx) : null;
}

export function can(role, command, ctx = {}) {
  return explain(role, command, ctx) === null;
}

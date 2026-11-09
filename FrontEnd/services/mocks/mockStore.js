import { PRICING_CONFIG, calculateFare } from "../config";
import { explain } from "../permissions";
import { createSeed } from "./mockData";

// In-memory simulation of the backend rules. Every public function returns a Promise
// (rejecting with Error{status} on a rule violation), like apiRequest would.

let state = createSeed();
let actingCourierId = state.couriers[0].id;

function fail(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function respond(action) {
  return new Promise((resolve) => resolve(action()));
}

const copy = (value) => JSON.parse(JSON.stringify(value));

function find(list, id, label) {
  const item = list.find((entry) => String(entry.id) === String(id));
  if (!item) fail(`${label} ${id} not found.`, 404);
  return item;
}

const findOrder = (id) => find(state.orders, id, "Order");
const findCourier = (id) => find(state.couriers, id, "Courier");
const findRestaurant = (id) => find(state.restaurants, id, "Restaurant");

const QUEUED_STATUSES = ["PLACED", "ACCEPTED", "PREPARING"];

function queueSize(restaurantId) {
  return state.orders.filter(
    (o) => o.restaurantId === restaurantId && QUEUED_STATUSES.includes(o.status)
  ).length;
}

// Stalled: the courier accepted the order, then went offline before pickup (UC-DRV-07).
function isStalled(order) {
  return (
    order.status === "READY" &&
    order.courierId !== null &&
    order.offerAccepted &&
    findCourier(order.courierId).status === "OFFLINE"
  );
}

function distance(a, b) {
  const R = 6371;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Nearest IDLE courier by straight-line distance, ties to the lowest id; one order per courier.
function dispatch(skipCourierId = null) {
  for (const orderId of [...state.dispatchQueue]) {
    const order = findOrder(orderId);
    const restaurant = findRestaurant(order.restaurantId);
    const candidates = state.couriers
      .filter((c) => c.status === "IDLE" && c.id !== skipCourierId)
      .sort((a, b) => distance(a, restaurant) - distance(b, restaurant) || a.id - b.id);
    if (candidates.length === 0) return;

    const courier = candidates[0];
    courier.status = "ASSIGNED";
    courier.currentOrderId = order.id;
    order.courierId = courier.id;
    order.offerAccepted = false;
    state.dispatchQueue = state.dispatchQueue.filter((id) => id !== order.id);
  }
}

function makeIdle(courier) {
  courier.status = "IDLE";
  courier.currentOrderId = null;
  dispatch();
}

function addLedgerEntry(order, type, finalState) {
  const total = calculateFare(orderSubtotal(order)).total;
  state.ledger.push({
    entryId: state.nextLedgerId++,
    orderId: order.id,
    type,
    finalState,
    recordedAt: new Date().toISOString(),
    amount: total,
    currency: PRICING_CONFIG.currency,
  });
}

function orderSubtotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function restaurantView(restaurant) {
  return { ...restaurant, queueSize: queueSize(restaurant.id) };
}

function orderView(order) {
  return { ...copy(order), canReassign: isStalled(order) };
}

function courierView(courier) {
  return { ...courier };
}

function offerView(order, courier) {
  const restaurant = findRestaurant(order.restaurantId);
  return {
    orderId: order.id,
    orderStatus: order.status,
    accepted: order.offerAccepted,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantLatitude: restaurant.latitude,
    restaurantLongitude: restaurant.longitude,
    dropoffLatitude: order.dropoffLatitude,
    dropoffLongitude: order.dropoffLongitude,
    items: copy(order.items.map(({ id, name, quantity }) => ({ id, name, quantity }))),
    courierStatus: courier.status,
  };
}

// --- Test/demo helpers (not part of the backend contract) ---

// Lets the courier views act as a different seeded courier.
export function setActingCourier(courierId) {
  actingCourierId = findCourier(courierId).id;
}

// Moves an order through the restaurant lifecycle; READY triggers dispatch.
export function setOrderStatus(orderId, status) {
  return respond(() => {
    const order = findOrder(orderId);
    order.status = status;
    if (status === "READY") {
      order.readyAt = new Date().toISOString();
      order.courierId = null;
      state.dispatchQueue.push(order.id);
      dispatch();
    }
    return orderView(order);
  });
}

// --- Dispatch ---

export const getCouriers = () => respond(() => state.couriers.map(courierView));

export const getDispatchQueue = () =>
  respond(() =>
    state.dispatchQueue.map((orderId) => {
      const order = findOrder(orderId);
      return {
        orderId: order.id,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        readyAt: order.readyAt,
        waitingSeconds: Math.floor((Date.now() - Date.parse(order.readyAt)) / 1000),
      };
    })
  );

export const getRestaurants = () => respond(() => state.restaurants.map(restaurantView));

// --- Courier ---

export const courierGetMe = () => respond(() => courierView(findCourier(actingCourierId)));

export const courierGoOnDuty = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status !== "OFFLINE") fail("You are already on duty.");
    // A courier who still holds an accepted order resumes it.
    if (courier.currentOrderId !== null) courier.status = "ASSIGNED";
    else makeIdle(courier);
    return courierView(courier);
  });

export const courierGoOffDuty = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status === "OFFLINE") fail("You are already off duty.");
    if (courier.status === "CARRYING") fail("You cannot go off duty while carrying an order.");
    if (courier.status === "ASSIGNED" && !findOrder(courier.currentOrderId).offerAccepted) {
      // An unaccepted offer goes back to the queue; an accepted order stalls until the operator acts.
      const order = findOrder(courier.currentOrderId);
      order.courierId = null;
      state.dispatchQueue.unshift(order.id);
      courier.currentOrderId = null;
    }
    courier.status = "OFFLINE";
    dispatch(courier.id);
    return courierView(courier);
  });

export const courierGetOffer = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status === "OFFLINE" || courier.currentOrderId === null) return null;
    return offerView(findOrder(courier.currentOrderId), courier);
  });

export const courierAcceptOffer = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status !== "ASSIGNED") fail("There is no offer to accept.");
    const order = findOrder(courier.currentOrderId);
    if (order.offerAccepted) fail("The offer was already accepted.");
    order.offerAccepted = true;
    return courierView(courier);
  });

export const courierDeclineOffer = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status !== "ASSIGNED") fail("There is no offer to decline.");
    const order = findOrder(courier.currentOrderId);
    if (order.offerAccepted) fail("An accepted offer cannot be declined.");
    order.courierId = null;
    state.dispatchQueue.unshift(order.id);
    courier.status = "IDLE";
    courier.currentOrderId = null;
    // Other couriers first; the order waits in the queue if this was the only idle one.
    dispatch(courier.id);
    return courierView(courier);
  });

export const courierConfirmPickup = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status !== "ASSIGNED") fail("You have no assigned order.");
    const order = findOrder(courier.currentOrderId);
    if (!order.offerAccepted) fail("Accept the offer first.");
    if (order.status !== "READY") fail("The order is not ready for pickup yet.");
    const restaurant = findRestaurant(order.restaurantId);
    order.status = "PICKED_UP";
    courier.status = "CARRYING";
    courier.latitude = restaurant.latitude;
    courier.longitude = restaurant.longitude;
    return courierView(courier);
  });

export const courierConfirmDelivery = () =>
  respond(() => {
    const courier = findCourier(actingCourierId);
    if (courier.status !== "CARRYING") fail("You are not carrying an order.");
    const order = findOrder(courier.currentOrderId);
    if (order.status !== "PICKED_UP") fail("The order has not been picked up.");
    order.status = "DELIVERED";
    order.deliveredAt = new Date().toISOString();
    addLedgerEntry(order, "CHARGE", "DELIVERED");
    courier.latitude = order.dropoffLatitude;
    courier.longitude = order.dropoffLongitude;
    makeIdle(courier);
    return courierView(courier);
  });

// --- Operator ---

export const getOperatorDashboard = () =>
  respond(() => ({
    restaurants: state.restaurants.map(restaurantView),
    orders: state.orders.map(orderView),
  }));

export const pauseRestaurant = (restaurantId) =>
  respond(() => {
    const restaurant = findRestaurant(restaurantId);
    if (restaurant.status !== "OPEN") fail("Only an open restaurant can be paused.");
    restaurant.status = "PAUSED";
    return restaurantView(restaurant);
  });

export const reopenRestaurant = (restaurantId) =>
  respond(() => {
    const restaurant = findRestaurant(restaurantId);
    if (restaurant.status !== "PAUSED") fail("Only a paused restaurant can be reopened.");
    restaurant.status = "OPEN";
    return restaurantView(restaurant);
  });

export const reassignOrder = (orderId) =>
  respond(() => {
    const order = findOrder(orderId);
    if (!isStalled(order)) fail("Only stalled orders can be reassigned.");
    findCourier(order.courierId).currentOrderId = null;
    order.courierId = null;
    order.offerAccepted = false;
    order.readyAt = new Date().toISOString();
    state.dispatchQueue = [order.id, ...state.dispatchQueue.filter((id) => id !== order.id)];
    dispatch();
    return orderView(order);
  });

export const refundOrder = (orderId) =>
  respond(() => {
    const order = findOrder(orderId);
    if (order.status !== "DELIVERED") fail("Only delivered orders can be refunded.");
    order.status = "REFUNDED";
    addLedgerEntry(order, "REFUND", "REFUNDED");
    return orderView(order);
  });

export const getLedger = () => respond(() => copy(state.ledger));

export const resetSystem = () =>
  respond(() => {
    state = createSeed();
    actingCourierId = state.couriers[0].id;
    return null;
  });

// --- Pricing ---

export const getPricingConfig = () => respond(() => ({ ...PRICING_CONFIG }));

export const getOrderFare = (orderId) =>
  respond(() => calculateFare(orderSubtotal(findOrder(orderId))));

export const getOrderSummary = (orderId) =>
  respond(() => {
    const order = findOrder(orderId);
    if (!["DELIVERED", "REFUNDED"].includes(order.status)) fail("Order has not been delivered yet.");
    return {
      orderId: order.id,
      status: order.status,
      deliveredAt: order.deliveredAt,
      fare: calculateFare(orderSubtotal(order)),
    };
  });

// History is the ledger, scoped like the backend does: a courier sees only their own deliveries.
export const getHistory = (role) =>
  respond(() =>
    copy(
      state.ledger.filter(
        (entry) => role !== "COURIER" || findOrder(entry.orderId).courierId === actingCourierId
      )
    )
  );

// --- Refund requests ---

const findRefund = (id) => find(state.refundRequests, id, "Refund request");

function refundView(request) {
  return { ...request, orderStatus: findOrder(request.orderId).status };
}

export const getRefundableOrders = () =>
  respond(() => copy(state.orders.filter((o) => ["PICKED_UP", "DELIVERED"].includes(o.status))));

export const getRefundRequests = () => respond(() => state.refundRequests.map(refundView));

export const submitRefundRequest = ({ orderId, reason, proof }) =>
  respond(() => {
    const order = findOrder(orderId);
    if (!proof) fail("Proof is required.", 400);
    const reasonBlocked = explain("CUSTOMER", "requestRefund", {
      orderStatus: order.status,
      deliveredAt: order.deliveredAt,
      refundReason: reason,
      hasPendingRequest: state.refundRequests.some(
        (r) => r.orderId === order.id && r.status === "PENDING"
      ),
    });
    if (reasonBlocked) fail(reasonBlocked);
    const request = {
      id: state.nextRefundId++,
      orderId: order.id,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
      reason,
      proof,
      status: "PENDING",
    };
    state.refundRequests.push(request);
    return refundView(request);
  });

export const acceptRefundRequest = (requestId) =>
  respond(() => {
    const request = findRefund(requestId);
    if (request.status !== "PENDING") fail("This request was already decided.");
    const order = findOrder(request.orderId);
    if (!["DELIVERED", "PICKED_UP"].includes(order.status)) fail("This order can no longer be refunded.");
    if (order.status === "PICKED_UP") {
      // Stolen or lost: the order never got a charge entry, and the courier no longer holds it.
      addLedgerEntry(order, "CHARGE", "PICKED_UP");
      const courier = findCourier(order.courierId);
      courier.status = "OFFLINE";
      courier.currentOrderId = null;
    }
    order.status = "REFUNDED";
    addLedgerEntry(order, "REFUND", "REFUNDED");
    request.status = "ACCEPTED";
    return refundView(request);
  });

export const declineRefundRequest = (requestId) =>
  respond(() => {
    const request = findRefund(requestId);
    if (request.status !== "PENDING") fail("This request was already decided.");
    request.status = "DECLINED";
    return refundView(request);
  });

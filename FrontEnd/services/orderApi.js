import { apiRequest } from "./apiClient";

function toOrder(order) {
  return {
    id: order.orderId,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
latitude: order.latitude,
longitude: order.longitude,

    items: order.lines.map((line) => ({
      id: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
    })),

    placedAt: order.placedAt,

    acceptedAt: order.acceptedAt
      ? Date.parse(order.acceptedAt)
      : null,

    readyAt: order.readyAt,
    deliveredAt: order.deliveredAt,
    reason: order.reason,
    courierId: order.courierId,
    courierName: order.courierName,
    courierStatus: order.courierStatus,
    courierLatitude: order.courierLatitude,
    courierLongitude: order.courierLongitude,
  };
}

// card = saved card from paymentApi.getSavedCard: { brand, last4, holder, expMonth, expYear }
// (never the full number or CVV). The backend stores it on the order and bills the fare total.
export async function placeOrder(
  restaurantId,
  selectedItems,
  delivery,
  card,
  promoCode = null
) {
  if (
    !delivery?.deliveryAddress?.trim() ||
    !Number.isFinite(delivery.latitude) ||
    !Number.isFinite(delivery.longitude) ||
    Math.abs(delivery.latitude) > 90 ||
    Math.abs(delivery.longitude) > 180
  ) {
    throw new Error("Please select a valid delivery address.");
  }

  const order = await apiRequest("/api/orders", {
    method: "POST",

    body: {
      restaurantId: String(restaurantId),

      deliveryAddress: delivery.deliveryAddress.trim(),
      latitude: delivery.latitude,
      longitude: delivery.longitude,

      payment: card
        ? {
            brand: card.brand,
            last4: card.last4,
            holder: card.holder,
            expMonth: card.expMonth,
            expYear: card.expYear,
          }
        : null,

      lines: selectedItems.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity
      })),

      // The backend re-validates the code at placement (R-PROMO-01).
      ...(promoCode ? { promoCode } : {})
    }
  });

  return toOrder(order);
}
export async function getMyOrders() {
  const orders = await apiRequest("/api/orders/me");

  return orders.map(toOrder);
}

export async function getRestaurantOrders(restaurantId) {
  const orders = await apiRequest(
    `/api/orders/restaurant/${restaurantId}`
  );

  return orders.map(toOrder);
}

export async function updateOrderStatus(orderId, status) {
  const order = await apiRequest(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: { status },
    }
  );

  return toOrder(order);
}

export async function rejectOrder(orderId, reason) {
  const order = await apiRequest(
    `/api/orders/${orderId}/reject`,
    {
      method: "POST",
      body: { reason },
    }
  );

  return toOrder(order);
}

export async function cancelOrder(orderId) {
  await apiRequest(`/api/orders/${orderId}/cancel`, {
    method: "POST",
  });
}
import { apiRequest } from "./apiClient";

// Backend OrderResponse -> the shape the order components already use
function toOrder(order) {
  return {
    id: order.orderId,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    status: order.status,
    items: order.lines.map((line) => ({
      id: line.menuItemId,
      name: line.name,
      quantity: line.quantity
    })),
    acceptedAt: order.acceptedAt ? Date.parse(order.acceptedAt) : null,
    reason: order.reason
  };
}

// selectedItems: [{ id, quantity }]
export async function placeOrder(restaurantId, selectedItems) {
  const order = await apiRequest("/api/orders", {
    method: "POST",
    body: {
      restaurantId: String(restaurantId),
      lines: selectedItems.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity
      }))
    }
  });
  return toOrder(order);
}

export async function getMyOrders() {
  const orders = await apiRequest("/api/orders/me");
  return orders.map(toOrder);
}

export async function getRestaurantOrders(restaurantId) {
  const orders = await apiRequest(`/api/orders/restaurant/${restaurantId}`);
  return orders.map(toOrder);
}

// status: "ACCEPTED" | "PREPARING" | "READY"
export async function updateOrderStatus(orderId, status) {
  const order = await apiRequest(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status }
  });
  return toOrder(order);
}

export async function rejectOrder(orderId, reason) {
  return toOrder(
    await apiRequest(`/api/orders/${orderId}/reject`, {
      method: "POST",
      body: { reason }
    })
  );
}

export async function cancelOrder(orderId) {
  await apiRequest(`/api/orders/${orderId}/cancel`, { method: "POST" });
}

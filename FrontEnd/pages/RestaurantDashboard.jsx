"use client";

import { useState } from "react";
import IncomingOrders from "../features/restaurant/IncomingOrders";
import OrderQueue from "../features/restaurant/OrderQueue";
import ManageMenu from "../features/restaurant/ManageMenu";

function RestaurantDashboard({
  restaurantId,
  restaurants,
  setRestaurants,
  orders,
  setOrders
}) {
  const [message, setMessage] = useState("");

  const restaurant = restaurants.find((r) => r.id === restaurantId);

  if (!restaurant) {
    return <p>Restaurant not found.</p>;
  }

  const restaurantOrders = orders.filter(
    (order) => order.restaurantId === restaurantId
  );

  function updateOrder(orderId, changes) {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId ? { ...order, ...changes } : order
      )
    );
  }

  function updateRestaurant(changes) {
    setRestaurants((previousRestaurants) =>
      previousRestaurants.map((r) =>
        r.id === restaurantId ? { ...r, ...changes } : r
      )
    );
  }

  function handleAcceptOrder(orderId) {
    updateOrder(orderId, { status: "accepted", acceptedAt: Date.now() });
    setMessage(`Order #${orderId} accepted`);
  }

  function handleRejectOrder(orderId) {
    updateOrder(orderId, { status: "rejected" });
    setMessage(`Order #${orderId} rejected`);
  }

  function handleStartPreparing(orderId) {
    updateOrder(orderId, { status: "preparing" });
    setMessage(`Order #${orderId} is being prepared`);
  }

  function handleMarkReady(orderId) {
    updateOrder(orderId, { status: "ready" });
    setMessage(`Order #${orderId} is ready`);
  }

  function handleUpdateItem(itemId, changes) {
    updateRestaurant({
      menu: restaurant.menu.map((item) =>
        item.id === itemId ? { ...item, ...changes } : item
      )
    });
  }

  function handleAddItem(name, price) {
    const nextId =
      restaurant.menu.reduce((max, item) => Math.max(max, item.id), restaurantId * 100) + 1;

    updateRestaurant({
      menu: [
        ...restaurant.menu,
        { id: nextId, name, price, status: "available" }
      ]
    });
    setMessage(`${name} added to the menu`);
  }

  function handleRemoveItem(itemId) {
    const removed = restaurant.menu.find((item) => item.id === itemId);

    updateRestaurant({
      menu: restaurant.menu.filter((item) => item.id !== itemId)
    });
    setMessage(`${removed.name} removed from the menu`);
  }

  function handleUpdateStatus(status) {
    updateRestaurant({ status });
    setMessage(`Restaurant status set to ${status}`);
  }

  return (
    <div className="dashboard">
      <h1>SweetByte</h1>
      <h2>Restaurant Dashboard: {restaurant.name}</h2>

      <p>{message}</p>

      <IncomingOrders
        orders={restaurantOrders}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
      />

      <OrderQueue
        orders={restaurantOrders}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
      />

      <ManageMenu
        restaurant={restaurant}
        onUpdateItem={handleUpdateItem}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}

export default RestaurantDashboard;

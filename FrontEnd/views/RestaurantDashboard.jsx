"use client";

import { useEffect, useState } from "react";
import IncomingOrders from "../features/restaurant/IncomingOrders";
import OrderQueue from "../features/restaurant/OrderQueue";
import ManageMenu from "../features/restaurant/ManageMenu";
import {
  addMenuItem,
  changeRestaurantStatus,
  getMenu,
  getRestaurant,
  removeMenuItem,
  setMenuItemStatus,
  updateMenuItem
} from "../services/restaurantApi";
import {
  getRestaurantOrders,
  rejectOrder,
  updateOrderStatus
} from "../services/orderApi";
import { getEnums } from "../services/enumApi";
import { StatusMessage, useStatus } from "../components/StatusMessage";

const DEFAULT_REJECT_REASON = "Rejected by restaurant";

function RestaurantDashboard({ restaurantId }) {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [restaurantStatuses, setRestaurantStatuses] = useState([]);
  const [status, show] = useStatus();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [restaurantInfo, menu, orderList, enums] = await Promise.all([
          getRestaurant(restaurantId),
          getMenu(restaurantId),
          getRestaurantOrders(restaurantId),
          getEnums()
        ]);
        setRestaurant({ ...restaurantInfo, menu });
        setOrders(orderList);
        setRestaurantStatuses(enums.restaurantStatuses);
      } catch (error) {
        show.error(error.message);
      }
    }

    loadDashboard();
  }, [restaurantId]);

  if (!restaurant) {
    return status.text ? <StatusMessage status={status} /> : <p>Loading restaurant...</p>;
  }

  // Runs an API call, shows its error if it fails
  async function run(action, successMessage) {
    try {
      await action();
      show.success(successMessage);
    } catch (error) {
      show.error(error.message);
    }
  }

  function replaceOrder(updatedOrder) {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
  }

  function setMenu(menu) {
    setRestaurant((previous) => ({ ...previous, menu }));
  }

  function replaceMenuItem(updatedItem) {
    setRestaurant((previous) => ({
      ...previous,
      menu: previous.menu.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  }

  function changeOrderStatus(orderId, status) {
    return run(
      async () => replaceOrder(await updateOrderStatus(orderId, status)),
      `Order #${orderId} is ${formatEnum(status).toLowerCase()}`
    );
  }

  function handleAcceptOrder(orderId) {
    return changeOrderStatus(orderId, "ACCEPTED");
  }

  function handleRejectOrder(orderId) {
    return run(
      async () => replaceOrder(await rejectOrder(orderId, DEFAULT_REJECT_REASON)),
      `Order #${orderId} rejected`
    );
  }

  function handleStartPreparing(orderId) {
    return changeOrderStatus(orderId, "PREPARING");
  }

  function handleMarkReady(orderId) {
    return changeOrderStatus(orderId, "READY");
  }

  // ManageMenu sends either { name, price } or { status }
  function handleUpdateItem(itemId, changes) {
    if (changes.status) {
      return run(
        async () =>
          replaceMenuItem(await setMenuItemStatus(restaurantId, itemId, changes.status)),
        "Item status updated"
      );
    }

    return run(
      async () =>
        replaceMenuItem(
          await updateMenuItem(restaurantId, itemId, changes.name, changes.price)
        ),
      `${changes.name} saved`
    );
  }

  function handleAddItem(name, price) {
    return run(async () => {
      const item = await addMenuItem(restaurantId, name, price);
      setRestaurant((previous) => ({ ...previous, menu: [...previous.menu, item] }));
    }, `${name} added to the menu`);
  }

  function handleRemoveItem(itemId) {
    const removed = restaurant.menu.find((item) => item.id === itemId);

    return run(
      async () => setMenu(await removeMenuItem(restaurantId, itemId)),
      `${removed.name} removed from the menu`
    );
  }

  function handleUpdateStatus(status) {
    return run(async () => {
      const updated = await changeRestaurantStatus(restaurantId, status);
      setRestaurant((previous) => ({ ...previous, status: updated.status }));
    }, `Restaurant status set to ${formatEnum(status)}`);
  }

  return (
    <div className="dashboard">
      <h1>SweetByte</h1>
      <h2>Restaurant Dashboard: {restaurant.name}</h2>

      <StatusMessage status={status} />

      <IncomingOrders
        orders={orders}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
      />

      <OrderQueue
        orders={orders}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
      />

      <ManageMenu
        restaurant={restaurant}
        restaurantStatuses={restaurantStatuses}
        onUpdateItem={handleUpdateItem}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}

export default RestaurantDashboard;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IncomingOrders from "../features/restaurant/IncomingOrders";
import OrderQueue from "../features/restaurant/OrderQueue";
import DispatchStatus from "../features/restaurant/DispatchStatus";
import ManageMenu from "../features/restaurant/ManageMenu";
import RestaurantSettings from "../features/restaurant/RestaurantSettings";
import QueueBadge from "../features/shared/QueueBadge";
import Tabs from "../components/Tabs";
import styles from "../features/restaurant/restaurant.module.css";
import { getEnums, formatEnum } from "../services/enumApi";
import {
  addMenuItem,
  changeRestaurantStatus,
  getMenu,
  getRestaurant,
  removeMenuItem,
  setMenuItemStatus,
  updateMenuItem
} from "../services/restaurantApi";
import { updateRestaurantLocation } from "../services/restaurantLocationApi";
import {
  getRestaurantOrders,
  rejectOrder,
  updateOrderStatus
} from "../services/orderApi";
import { StatusMessage, useStatus } from "../components/StatusMessage";

const POLL_INTERVAL_MS = 5000;
const PREPARATION_STATUSES = ["ACCEPTED", "PREPARING"];

function RestaurantDashboard({ restaurantId, onLog }) {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [restaurantStatuses, setRestaurantStatuses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, show] = useStatus();

  // Latest onLog without re-triggering effects
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const log = useCallback((entry) => {
    if (typeof logRef.current === "function") logRef.current(entry);
  }, []);

  // Bumped by every mutation; a poll that started before a mutation is discarded
  const version = useRef(0);
  const pollInFlight = useRef(false);
  const lastPollError = useRef("");

  // Only this restaurant's orders are ever shown
  const keepOwn = useCallback(
    (list) =>
      list.filter((order) => String(order.restaurantId) === String(restaurantId)),
    [restaurantId]
  );

  useEffect(() => {
    if (restaurantId === undefined || restaurantId === null || restaurantId === "") {
      return undefined;
    }

    let cancelled = false;
    setRestaurant(null);
    setOrders([]);

    async function loadDashboard() {
      const command = "Load restaurant dashboard";
      log({ command });
      try {
        const [restaurantInfo, menu, orderList, enums] = await Promise.all([
          getRestaurant(restaurantId),
          getMenu(restaurantId),
          getRestaurantOrders(restaurantId),
          getEnums()
        ]);
        if (cancelled) return;
        setRestaurant({ ...restaurantInfo, menu });
        setOrders(keepOwn(orderList));
        setRestaurantStatuses(enums.restaurantStatuses);
        log({ command, result: "Success" });
      } catch (error) {
        if (cancelled) return;
        show.error(error.message);
        log({ command, error: error.message });
      }
    }

    async function poll() {
      if (pollInFlight.current || document.hidden) return;
      pollInFlight.current = true;
      const startedAt = version.current;

      try {
        const [orderList, info] = await Promise.all([
          getRestaurantOrders(restaurantId),
          getRestaurant(restaurantId)
        ]);
        if (cancelled || startedAt !== version.current) return;
        setOrders(keepOwn(orderList));
        setRestaurant((previous) =>
          previous
            ? { ...previous, status: info.status, queueSize: info.queueSize }
            : previous
        );
        lastPollError.current = "";
      } catch (error) {
        // Log a repeating failure once, not every 5 seconds
        if (!cancelled && lastPollError.current !== error.message) {
          lastPollError.current = error.message;
          log({ command: "Refresh restaurant orders", error: error.message });
        }
      } finally {
        pollInFlight.current = false;
      }
    }

    loadDashboard();
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // show is recreated each render but only calls state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, keepOwn, log]);

  if (restaurantId === undefined || restaurantId === null || restaurantId === "") {
    return (
      <div className={styles.dashboard}>
        <p className={styles.empty} role="alert">
          No restaurant is linked to this account.
        </p>
      </div>
    );
  }

  if (!restaurant) {
    return status.text ? (
      <StatusMessage status={status} />
    ) : (
      <p role="status">Loading restaurant...</p>
    );
  }

  // Logs the command before and after, shows feedback. Resolves true on success.
  async function run(command, action, successMessage) {
    version.current += 1;
    setBusy(true);
    log({ command });
    try {
      await action();
      show.success(successMessage);
      log({ command, result: "Success" });
      return true;
    } catch (error) {
      show.error(error.message);
      log({ command, error: error.message });
      return false;
    } finally {
      version.current += 1;
      setBusy(false);
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

  function changeOrderStatus(command, orderId, newStatus) {
    return run(
      command,
      async () => replaceOrder(await updateOrderStatus(orderId, newStatus)),
      `Order #${orderId} is ${formatEnum(newStatus).toLowerCase()}`
    );
  }

  function handleAcceptOrder(orderId) {
    return changeOrderStatus(`Accept order #${orderId}`, orderId, "ACCEPTED");
  }

  function handleRejectOrder(orderId, reason) {
    return run(
      `Reject order #${orderId} (reason: ${reason})`,
      async () => replaceOrder(await rejectOrder(orderId, reason)),
      `Order #${orderId} rejected`
    );
  }

  function handleStartPreparing(orderId) {
    return changeOrderStatus(`Start preparing order #${orderId}`, orderId, "PREPARING");
  }

  function handleMarkReady(orderId) {
    return changeOrderStatus(`Mark order #${orderId} ready`, orderId, "READY");
  }

  // ManageMenu sends either { name, price } or { status }
  function handleUpdateItem(itemId, changes) {
    const item = restaurant.menu.find((entry) => entry.id === itemId);
    const label = item ? item.name : `#${itemId}`;

    if (changes.status) {
      const soldOut = changes.status === "SOLD_OUT";
      return run(
        soldOut ? `Mark "${label}" sold out` : `Mark "${label}" available`,
        async () =>
          replaceMenuItem(await setMenuItemStatus(restaurantId, itemId, changes.status)),
        soldOut ? `${label} marked sold out` : `${label} marked available`
      );
    }

    return run(
      `Edit menu item "${label}"`,
      async () =>
        replaceMenuItem(
          await updateMenuItem(restaurantId, itemId, changes.name, changes.price)
        ),
      `${changes.name} saved`
    );
  }

  function handleAddItem(name, price) {
    return run(
      `Add menu item "${name}"`,
      async () => {
        const item = await addMenuItem(restaurantId, name, price);
        setRestaurant((previous) => ({ ...previous, menu: [...previous.menu, item] }));
      },
      `${name} added to the menu`
    );
  }

  function handleRemoveItem(itemId) {
    const removed = restaurant.menu.find((item) => item.id === itemId);
    const label = removed ? removed.name : `#${itemId}`;

    return run(
      `Remove menu item "${label}"`,
      async () => setMenu(await removeMenuItem(restaurantId, itemId)),
      `${label} removed from the menu`
    );
  }

  function handleUpdateStatus(target) {
    let command = `Set restaurant status to ${formatEnum(target)}`;
    if (target === "PAUSED") command = "Pause restaurant";
    if (target === "OPEN" && restaurant.status === "PAUSED") command = "Reopen restaurant";

    return run(
      command,
      async () => {
        const updated = await changeRestaurantStatus(restaurantId, target);
        setRestaurant((previous) => ({ ...previous, status: updated.status }));
      },
      `Restaurant status set to ${formatEnum(target)}`
    );
  }

  // Resolves true on success so the settings panel can end map picking
  async function handleSaveLocation(latitude, longitude) {
    const command = "Set restaurant location";
    version.current += 1;
    setBusy(true);
    log({ command });
    try {
      const { saved } = await updateRestaurantLocation(restaurantId, latitude, longitude);
      setRestaurant((previous) => ({ ...previous, latitude, longitude }));
      show.success(
        saved === "local"
          ? "Saved in this browser only — the server has no location endpoint yet"
          : "Location saved"
      );
      log({ command, result: "Success" });
      return true;
    } catch (error) {
      show.error(error.message);
      log({ command, error: error.message });
      return false;
    } finally {
      version.current += 1;
      setBusy(false);
    }
  }

  const preparationQueueSize =orders.filter((order) =>
    PREPARATION_STATUSES.includes(order.status)
  ).length;
  const incomingCount = orders.filter((order) => order.status === "PLACED").length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h2 className={styles.title}>Restaurant: {restaurant.name}</h2>
        <p className={styles.headerMeta}>
          <span
            className={`${styles.statusPill} ${
              styles[`restaurant${restaurant.status}`] || ""
            }`}
          >
            {formatEnum(restaurant.status)}
          </span>
          <QueueBadge size={preparationQueueSize} />
        </p>
      </header>

      <div aria-live="polite">
        <StatusMessage status={status} />
      </div>

      <Tabs
        ariaLabel="Restaurant sections"
        defaultTab="orders"
        tabs={[
          {
            id: "orders",
            label: "Orders",
            badge: incomingCount,
            content: (
              <IncomingOrders
                orders={orders}
                busy={busy}
                onAccept={handleAcceptOrder}
                onReject={handleRejectOrder}
              />
            )
          },
          {
            id: "queue",
            label: "Queue",
            badge: preparationQueueSize,
            content: (
              <div className={styles.stack}>
                <OrderQueue
                  orders={orders}
                  busy={busy}
                  queueSize={preparationQueueSize}
                  onStartPreparing={handleStartPreparing}
                  onMarkReady={handleMarkReady}
                />
                <DispatchStatus orders={orders} />
              </div>
            )
          },
          {
            id: "menu",
            label: "Menu",
            content: (
              <ManageMenu
                restaurant={restaurant}
                busy={busy}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
              />
            )
          },
          {
            id: "settings",
            label: "Settings",
            content: (
              <RestaurantSettings
                restaurant={restaurant}
                restaurantStatuses={restaurantStatuses}
                busy={busy}
                onUpdateStatus={handleUpdateStatus}
                onSaveLocation={handleSaveLocation}
              />
            )
          }
        ]}
      />
    </div>
  );
}

export default RestaurantDashboard;

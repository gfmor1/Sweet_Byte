"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Tabs from "../components/Tabs";
import { useMapFocus } from "../components/MapFocusContext";
import RestaurantList from "../features/customer/RestaurantList";
import PlaceOrder from "../features/customer/PlaceOrder";
import OrderTracker, {
  ACTIVE_STATUSES,
} from "../features/customer/OrderTracker";
import ActiveOrdersBar from "../features/customer/ActiveOrdersBar";
import { courierMarker } from "../features/customer/normalizeCourier";
import CustomerPaymentsPanel from "../features/payment/CustomerPaymentsPanel";
import { attachPaymentToOrder, chargeOrder, paymentsEnabled } from "../services/paymentApi";
import { calculateFare } from "../services/config";
import OrderHistory from "../features/pricing/OrderHistory";
import OrderSummary from "../features/pricing/OrderSummary";
import styles from "../features/customer/customer.module.css";

import {
  getMenu,
  getRestaurants,
} from "../services/restaurantApi";

import LocationControl from "../features/customer/LocationControl";
import {
  clearCustomerLocation,
  getCustomerLocation,
  setCustomerLocation,
} from "../services/locationOverrides";

import {
  cancelOrder,
  getMyOrders,
  placeOrder,
} from "../services/orderApi";

const REFRESH_COMMAND = "Refresh customer dashboard";

export default function CustomerDashboard({ user, onLog }) {
  const role = user?.role || "CUSTOMER";

  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentsKey, setPaymentsKey] = useState(0);

  const [activeTab, setActiveTab] = useState("restaurants");
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [openSummaries, setOpenSummaries] = useState({});

  const mapFocus = useMapFocus();
  const setMapFocus = useRef(mapFocus?.setFocus);

  useEffect(() => {
    setMapFocus.current = mapFocus?.setFocus;
  }, [mapFocus]);

  const setMapExtras = useRef(mapFocus?.setExtras);

  useEffect(() => {
    setMapExtras.current = mapFocus?.setExtras;
  }, [mapFocus]);

  // Simulated delivery location ("You" pin), kept in this browser only.
  const [savedLocation, setSavedLocation] = useState(null);
  const [picking, setPicking] = useState(false);
  const [draftLocation, setDraftLocation] = useState(null);

  useEffect(() => {
    const saved = getCustomerLocation();
    if (saved) {
      setSavedLocation(saved);
      setMapExtras.current?.({
        userPin: { name: "You", latitude: saved.latitude, longitude: saved.longitude },
      });
    }

    return () => {
      setMapExtras.current?.({
        userPin: null,
        picker: null,
        visibleRestaurantIds: null,
      });
    };
  }, []);

  const pickerActive = picking && activeTab === "restaurants" && !selectedRestaurant;
  const pickerPoint = draftLocation || savedLocation;
  const pickerLat = pickerPoint?.latitude;
  const pickerLng = pickerPoint?.longitude;

  useEffect(() => {
    if (!pickerActive) {
      setMapExtras.current?.({ picker: null });
      return;
    }

    setMapExtras.current?.({
      picker: {
        kind: "you",
        label: "Click the map to set your delivery location",
        point:
          pickerLat === undefined
            ? undefined
            : { latitude: pickerLat, longitude: pickerLng },
        onPick: (latitude, longitude) =>
          setDraftLocation({ latitude, longitude }),
      },
    });
  }, [pickerActive, pickerLat, pickerLng]);

  function startPicking() {
    setError("");
    setMessage("");
    setDraftLocation(null);
    setPicking(true);
  }

  function cancelPicking() {
    setPicking(false);
    setDraftLocation(null);
  }

  function saveLocation() {
    if (!draftLocation) return;
    onLog?.({ command: "Set my location" });

    try {
      setCustomerLocation(draftLocation.latitude, draftLocation.longitude);
      setSavedLocation(draftLocation);
      setMapExtras.current?.({
        userPin: {
          name: "You",
          latitude: draftLocation.latitude,
          longitude: draftLocation.longitude,
        },
      });
      setPicking(false);
      setDraftLocation(null);
      setMessage("Delivery location saved (simulated, this browser only).");
      onLog?.({ command: "Set my location", result: "Success" });
    } catch (err) {
      setError(err.message);
      onLog?.({ command: "Set my location", error: err.message });
    }
  }

  function clearLocation() {
    clearCustomerLocation();
    setSavedLocation(null);
    setDraftLocation(null);
    setPicking(false);
    setMapExtras.current?.({ userPin: null });
    setMessage("Delivery location cleared.");
  }

  const handleVisibleIds = useCallback((ids) => {
    setMapExtras.current?.({ visibleRestaurantIds: ids });
  }, []);

  const mounted = useRef(false);
  const loading = useRef(false);
  const selection = useRef(null);
  const lastRefreshError = useRef("");
  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  // Resolves true on success, false on failure. Failures are logged once per
  // distinct message so the 5 s poll does not flood the console.
  const refresh = useCallback(async () => {
    if (loading.current) return null;

    loading.current = true;

    if (mounted.current) {
      setRefreshing(true);
    }

    try {
      const [nextRestaurants, nextOrders] = await Promise.all([
        getRestaurants(),
        getMyOrders(),
      ]);

      const selectedId = selection.current;
      let updatedRestaurant = null;

      if (selectedId !== null) {
        const restaurant = nextRestaurants.find(
          (item) => item.id === selectedId
        );

        if (restaurant) {
          const menu = await getMenu(selectedId);
          updatedRestaurant = { ...restaurant, menu };
        }
      }

      if (!mounted.current) return true;

      setRestaurants(nextRestaurants);
      setOrders(nextOrders);
      setLoaded(true);

      if (
        selectedId !== null &&
        selection.current === selectedId
      ) {
        setSelectedRestaurant(updatedRestaurant);

        if (!updatedRestaurant) {
          selection.current = null;
        }
      }

      setError("");
      lastRefreshError.current = "";

      return true;
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }

      if (lastRefreshError.current !== err.message) {
        lastRefreshError.current = err.message;

        logCallback.current?.({
          command: REFRESH_COMMAND,
          error: err.message,
        });
      }

      return false;
    } finally {
      loading.current = false;

      if (mounted.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    let timer;
    let stopped = false;

    async function poll() {
      await refresh();

      if (!stopped) {
        timer = setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      mounted.current = false;
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  async function selectRestaurant(restaurant) {
    selection.current = restaurant.id;

    setError("");
    setMessage("");

    onLog?.({
      command: "Browse menu",
      restaurantId: restaurant.id,
    });

    try {
      const menu = await getMenu(restaurant.id);

      if (
        mounted.current &&
        selection.current === restaurant.id
      ) {
        setSelectedRestaurant({ ...restaurant, menu });
      }

      onLog?.({
        command: "Browse menu",
        restaurantId: restaurant.id,
        result: "Success",
      });
    } catch (err) {
      if (
        mounted.current &&
        selection.current === restaurant.id
      ) {
        setError(err.message);
      }

      onLog?.({
        command: "Browse menu",
        restaurantId: restaurant.id,
        error: err.message,
      });
    }
  }

  async function handlePlaceOrder(items, { subtotal = 0 } = {}) {
    setError("");
    setMessage("");

    onLog?.({
      command: "Place Order",
      restaurantId: selectedRestaurant.id,
    });

    try {
      // Charge the saved card first; a decline stops the order from being placed.
      let payment = null;
      if (paymentsEnabled) {
        onLog?.({ command: "Charge payment card" });
        try {
          payment = await chargeOrder(user, { amount: calculateFare(subtotal).total });
          onLog?.({ command: "Charge payment card", result: "Success" });
        } catch (chargeErr) {
          setPaymentsKey((previous) => previous + 1);
          const hint = chargeErr.status === 402 && /card first/i.test(chargeErr.message)
            ? " Open the Payments tab to add one."
            : "";
          throw new Error(chargeErr.message + hint);
        }
      }

      const order = await placeOrder(
        selectedRestaurant.id,
        items
      );

      if (payment) {
        attachPaymentToOrder(payment.paymentId, order.id).catch(() => {});
        setPaymentsKey((previous) => previous + 1);
      }

      onLog?.({
        command: "Place Order",
        restaurantId: selectedRestaurant.id,
        orderId: order.id,
        result: "Success",
      });

      if (!mounted.current) return true;

      setOrders((previous) => [
        ...previous.filter((item) => item.id !== order.id),
        order,
      ]);

      setMessage(`Order #${order.id} placed successfully.`);
      setRefreshKey((previous) => previous + 1);

      await refresh();

      return true;
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }

      onLog?.({
        command: "Place Order",
        restaurantId: selectedRestaurant.id,
        error: err.message,
      });

      return false;
    }
  }

  async function handleCancelOrder(orderId) {
    if (cancelling !== null) return;

    setCancelling(orderId);
    setError("");
    setMessage("");

    onLog?.({
      command: "Cancel Order",
      orderId,
    });

    try {
      await cancelOrder(orderId);

      onLog?.({
        command: "Cancel Order",
        orderId,
        result: "Success",
      });

      if (!mounted.current) return;

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, status: "CANCELLED" }
            : order
        )
      );

      setMessage(`Order #${orderId} cancelled.`);
      setRefreshKey((previous) => previous + 1);

      await refresh();
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }

      onLog?.({
        command: "Cancel Order",
        orderId,
        error: err.message,
      });
    } finally {
      if (mounted.current) {
        setCancelling(null);
      }
    }
  }

  async function handleManualRefresh() {
    onLog?.({
      command: REFRESH_COMMAND,
    });

    // Manual refresh always reports its outcome.
    lastRefreshError.current = "";

    const ok = await refresh();

    if (ok === true) {
      onLog?.({
        command: REFRESH_COMMAND,
        result: "Success",
      });
    }

    setRefreshKey((previous) => previous + 1);
  }

  function backToRestaurants() {
    selection.current = null;
    setSelectedRestaurant(null);
  }

  function openOrderFromBar(orderId) {
    setActiveTab("orders");
    setFocusedOrderId(orderId);
    setScrollTarget(orderId);
  }

  const sortedOrders = [...orders].sort(
    (a, b) => Number(b.id) - Number(a.id)
  );

  const activeOrders = sortedOrders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status)
  );

  const pastOrders = sortedOrders.filter((order) =>
    ["DELIVERED", "REFUNDED"].includes(order.status)
  );

  // Map focus: the open restaurant (with couriers of its active orders), or
  // the order selected in My Orders.
  const focusOrderIds = new Set();
  let focusRestaurantIds = null;

  if (activeTab === "restaurants" && selectedRestaurant) {
    focusRestaurantIds = [selectedRestaurant.id];
    activeOrders
      .filter((o) => String(o.restaurantId) === String(selectedRestaurant.id))
      .forEach((o) => focusOrderIds.add(o.id));
  } else if (activeTab === "orders") {
    // My Orders: the map shows only the restaurant(s) of my active orders and their couriers.
    // Selecting one order card narrows it to that order.
    const selectedOrder =
      focusedOrderId !== null
        ? activeOrders.find((o) => o.id === focusedOrderId)
        : null;
    const shown = selectedOrder ? [selectedOrder] : activeOrders;
    focusRestaurantIds = [...new Set(shown.map((o) => o.restaurantId))];
    shown.forEach((o) => focusOrderIds.add(o.id));
  }

  const focusCouriers = activeOrders
    .filter((o) => focusOrderIds.has(o.id))
    .map(courierMarker)
    .filter(Boolean);

  const focusKey =
    focusRestaurantIds === null
      ? "none"
      : JSON.stringify([focusRestaurantIds, focusCouriers]);

  useEffect(() => {
    if (focusKey === "none") {
      setMapFocus.current?.(null);
      return;
    }

    const [restaurantIds, couriers] = JSON.parse(focusKey);
    setMapFocus.current?.({ restaurantIds, couriers });
  }, [focusKey]);

  useEffect(() => {
    return () => setMapFocus.current?.(null);
  }, []);

  // Scroll to an order card once the My Orders tab has rendered it.
  useEffect(() => {
    if (scrollTarget === null || activeTab !== "orders") return;

    let tries = 0;
    let timer;

    function attempt() {
      const el = document.getElementById(`order-${scrollTarget}-card`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollTarget(null);
      } else if (tries++ < 10) {
        timer = setTimeout(attempt, 50);
      } else {
        setScrollTarget(null);
      }
    }

    attempt();

    return () => clearTimeout(timer);
  }, [scrollTarget, activeTab, orders]);

  const restaurantsContent = selectedRestaurant ? (
    <section className={styles.section}>
      <button className="btn-secondary" onClick={backToRestaurants}>
        Back to restaurants
      </button>

      <h2 className={styles.sectionHead} style={{ marginTop: "0.75rem" }}>
        {selectedRestaurant.name}
      </h2>

      <PlaceOrder
        key={selectedRestaurant.id}
        restaurant={selectedRestaurant}
        role={role}
        onLog={onLog}
        onPlaceOrder={handlePlaceOrder}
      />
    </section>
  ) : (
    <RestaurantList
      restaurants={restaurants}
      loading={!loaded}
      onSelect={selectRestaurant}
      onVisibleIdsChange={handleVisibleIds}
      headerExtra={
        <LocationControl
          saved={savedLocation}
          draft={draftLocation}
          picking={picking}
          onStart={startPicking}
          onSave={saveLocation}
          onCancel={cancelPicking}
          onClear={clearLocation}
        />
      }
    />
  );

  const ordersContent = (
    <section className={styles.section} aria-labelledby="my-orders-heading">
      <h2 id="my-orders-heading" className={styles.sectionHead}>
        My Orders
      </h2>

      {sortedOrders.length === 0 ? (
        loaded && (
          <p>
            You have no orders yet. Open the Restaurants tab to place your
            first order.
          </p>
        )
      ) : (
        <ul className={`${styles.grid} ${styles.gridWide}`}>
          {sortedOrders.map((order) => (
            <OrderTracker
              key={order.id}
              order={order}
              role={role}
              cancelling={cancelling}
              onCancel={handleCancelOrder}
              onLog={onLog}
              selected={focusedOrderId === order.id}
              onSelect={setFocusedOrderId}
            />
          ))}
        </ul>
      )}
    </section>
  );

  const historyContent = loaded ? (
    <>
      <OrderHistory
        refreshKey={refreshKey}
        ownerOrderIds={orders.map((order) => order.id)}
        onLog={onLog}
      />

      {pastOrders.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>Delivered orders</h2>

          <ul className={`${styles.grid} ${styles.gridWide}`}>
            {pastOrders.map((order) => (
              <li key={order.id} className={`card ${styles.card}`}>
                <details
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    setOpenSummaries((prev) =>
                      prev[order.id] === open
                        ? prev
                        : { ...prev, [order.id]: open }
                    );
                  }}
                >
                  <summary>
                    Order #{order.id} - {order.restaurantName}
                  </summary>

                  {openSummaries[order.id] && (
                    <OrderSummary orderId={order.id} onLog={onLog} />
                  )}
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  ) : null;

  return (
    <div className="dashboard">
      <div className={styles.toolbar}>
        <h2 className={styles.sectionHead} style={{ margin: 0 }}>
          Customer Dashboard
        </h2>

        <button
          className="btn-secondary"
          disabled={refreshing}
          onClick={handleManualRefresh}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      <Tabs
        ariaLabel="Customer sections"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: "restaurants", label: "Restaurants", content: restaurantsContent },
          {
            id: "orders",
            label: "My Orders",
            badge: activeOrders.length || undefined,
            content: ordersContent,
          },
          { id: "history", label: "History", content: historyContent },
          ...(paymentsEnabled
            ? [
                {
                  id: "payments",
                  label: "Payments",
                  content: (
                    <CustomerPaymentsPanel
                      user={user}
                      onLog={onLog}
                      refreshKey={paymentsKey}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />

      <ActiveOrdersBar orders={orders} onOpenOrder={openOrderFromBar} />
    </div>
  );
}

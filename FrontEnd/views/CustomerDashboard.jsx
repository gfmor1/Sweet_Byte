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
import {
  getMyPayments,
  getSavedCard,
  paymentsEnabled,
} from "../services/paymentApi";
import OrderHistory from "../features/pricing/OrderHistory";
import RefundedNotice from "../features/payment/RefundedNotice";
import OrderSummary from "../features/pricing/OrderSummary";
import RefundPanel from "../features/refunds/RefundPanel";
import NoticeModal from "../features/shared/NoticeModal";
import styles from "../features/customer/customer.module.css";
import { isValidDelivery } from "../features/customer/deliveryAddress.mjs";

import {
  getMenu,
  getRestaurants,
} from "../services/restaurantApi";

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
  // Kept separately from `error`: the 5s auto-refresh clears `error`, but this dialog must stay until closed.
  const [cardNotice, setCardNotice] = useState("");
  useEffect(() => {
    if (error.startsWith("Add a payment card first")) setCardNotice(error);
  }, [error]);

  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentsKey, setPaymentsKey] = useState(0);
  const [paymentsByOrder, setPaymentsByOrder] = useState({});

  const [activeTab, setActiveTab] = useState("restaurants");
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [openSummaries, setOpenSummaries] = useState({});

  const mapFocus = useMapFocus();
  const setMapFocus = useRef(mapFocus?.setFocus);
  const setMapExtras = useRef(mapFocus?.setExtras);

  const mounted = useRef(false);
  const loading = useRef(false);
  const placingOrder = useRef(false);
  const selection = useRef(null);
  const lastRefreshError = useRef("");
  const logCallback = useRef(onLog);

  useEffect(() => {
    setMapFocus.current = mapFocus?.setFocus;
    setMapExtras.current = mapFocus?.setExtras;
  }, [mapFocus]);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  // Display the address selected at checkout on the map.
  const handleDeliveryChange = useCallback((delivery) => {
    setMapExtras.current?.({
      userPin: delivery
        ? {
            name: "Delivery address",
            latitude: delivery.latitude,
            longitude: delivery.longitude,
          }
        : null,
    });
  }, []);

  useEffect(() => {
    return () => {
      setMapExtras.current?.({
        userPin: null,
        picker: null,
        visibleRestaurantIds: null,
      });
    };
  }, []);

  const handleVisibleIds = useCallback((ids) => {
    setMapExtras.current?.({
      visibleRestaurantIds: ids,
    });
  }, []);

  // refresh is stable ([] deps); read the current user through a ref
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    if (loading.current) return null;

    loading.current = true;

    if (mounted.current) {
      setRefreshing(true);
    }

    try {
      const [nextRestaurants, nextOrders, nextPayments] = await Promise.all([
        getRestaurants(),
        getMyOrders(),
        // payments only add refund info to the order cards: never block the orders on them
        getMyPayments(userRef.current).catch(() => null),
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
      if (Array.isArray(nextPayments)) {
        setPaymentsByOrder(
          Object.fromEntries(nextPayments.map((p) => [p.orderId, p]))
        );
      }
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

  async function handlePlaceOrder(
    items,
    { subtotal = 0, delivery, promoCode = null } = {}
  ) {
    if (placingOrder.current || !selectedRestaurant) {
      return false;
    }

    placingOrder.current = true;

    const restaurantId = selectedRestaurant.id;

    setError("");
    setMessage("");

    onLog?.({
      command: "Place Order",
      restaurantId,
    });

    try {
      if (!isValidDelivery(delivery)) {
        throw new Error("Please select a valid delivery address.");
      }

      const destination = {
        deliveryAddress: delivery.deliveryAddress.trim(),
        latitude: delivery.latitude,
        longitude: delivery.longitude,
      };

      // The backend charges the saved card (mock), stores it on the order
      // and creates the PAYMENT billing record. Only brand/last4/holder/expiry are sent.
      const card = paymentsEnabled ? await getSavedCard(user) : null;
      if (!card) {
        throw new Error("Add a payment card first. Open the Payments tab to add one.");
      }

      const order = await placeOrder(
        restaurantId,
        items,
        destination,
        card,
        promoCode
      );

      setPaymentsKey((previous) => previous + 1);

      onLog?.({
        command: "Place Order",
        restaurantId,
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

      // Back to the main screen: the list of all restaurants.
      backToRestaurants();
      setActiveTab("restaurants");

      await refresh();

      return true;
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }

      onLog?.({
        command: "Place Order",
        restaurantId,
        error: err.message,
      });

      return false;
    } finally {
      placingOrder.current = false;
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
    handleDeliveryChange(null);
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

  const focusOrderIds = new Set();
  let focusRestaurantIds = null;

  if (activeTab === "restaurants" && selectedRestaurant) {
    focusRestaurantIds = [selectedRestaurant.id];

    activeOrders
      .filter(
        (order) =>
          String(order.restaurantId) ===
          String(selectedRestaurant.id)
      )
      .forEach((order) => focusOrderIds.add(order.id));
  } else if (activeTab === "orders") {
    const selectedOrder =
      focusedOrderId !== null
        ? activeOrders.find(
            (order) => order.id === focusedOrderId
          )
        : null;

    const shown = selectedOrder
      ? [selectedOrder]
      : activeOrders;

    focusRestaurantIds = [
      ...new Set(shown.map((order) => order.restaurantId)),
    ];

    shown.forEach((order) => focusOrderIds.add(order.id));
  }

  const focusCouriers = activeOrders
    .filter((order) => focusOrderIds.has(order.id))
    .map(courierMarker)
    .filter(Boolean);

  const focusKey =
    focusRestaurantIds === null
      ? "none"
      : JSON.stringify([
          focusRestaurantIds,
          focusCouriers,
        ]);

  useEffect(() => {
    if (focusKey === "none") {
      setMapFocus.current?.(null);
      return;
    }

    const [restaurantIds, couriers] = JSON.parse(focusKey);

    setMapFocus.current?.({
      restaurantIds,
      couriers,
    });
  }, [focusKey]);

  useEffect(() => {
    return () => setMapFocus.current?.(null);
  }, []);

  // "View menu" in the map's details panel.
  const selectRestaurantRef = useRef(selectRestaurant);
  selectRestaurantRef.current = selectRestaurant;

  useEffect(() => {
    setMapExtras.current?.({
      onViewMenu: (restaurant) => {
        setActiveTab("restaurants");
        selectRestaurantRef.current(restaurant);
      },
    });
    return () => setMapExtras.current?.({ onViewMenu: null });
  }, []);

  // Scroll to an order card once the My Orders tab has rendered it.
  useEffect(() => {
    if (
      scrollTarget === null ||
      activeTab !== "orders"
    ) {
      return;
    }

    let tries = 0;
    let timer;

    function attempt() {
      const element = document.getElementById(
        `order-${scrollTarget}-card`
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

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
      <button
        className="btn-secondary"
        onClick={backToRestaurants}
      >
        Back to restaurants
      </button>

      <h2
        className={styles.sectionHead}
        style={{ marginTop: "0.75rem" }}
      >
        {selectedRestaurant.name}
      </h2>

      <PlaceOrder
        key={selectedRestaurant.id}
        restaurant={selectedRestaurant}
        role={role}
        onLog={onLog}
        onPlaceOrder={handlePlaceOrder}
        onDeliveryChange={handleDeliveryChange}
      />
    </section>
  ) : (
    <RestaurantList
      restaurants={restaurants}
      loading={!loaded}
      onSelect={selectRestaurant}
      onVisibleIdsChange={handleVisibleIds}
    />
  );

  const ordersContent = (
    <section
      className={styles.section}
      aria-labelledby="my-orders-heading"
    >
      <h2
        id="my-orders-heading"
        className={styles.sectionHead}
      >
        My Orders
      </h2>

      {sortedOrders.length === 0 ? (
        loaded && (
          <p>
            You have no orders yet. Open the Restaurants tab
            to place your first order.
          </p>
        )
      ) : (
        <ul
          className={`${styles.grid} ${styles.gridWide}`}
        >
          {sortedOrders.map((order) => (
            <OrderTracker
              key={order.id}
              order={order}
              payment={paymentsByOrder[order.id]}
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

  // Shown as a centered dialog instead of an inline line: the customer must add a card to order.
  const isNoCardError = error.startsWith("Add a payment card first");

  const historyContent = loaded ? (
    <>
      <OrderHistory
        refreshKey={refreshKey}
        showPromo
        ownerOrderIds={orders.map((order) => order.id)}
        onLog={onLog}
      />

      {pastOrders.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHead}>
            Delivered orders
          </h2>

          <ul
            className={`${styles.grid} ${styles.gridWide}`}
          >
            {pastOrders.map((order) => (
              <li
                key={order.id}
                className={`card ${styles.card}`}
              >
                <details
                  onToggle={(event) => {
                    const open = event.currentTarget.open;

                    setOpenSummaries((previous) =>
                      previous[order.id] === open
                        ? previous
                        : {
                            ...previous,
                            [order.id]: open,
                          }
                    );
                  }}
                >
                  <summary>
                    Order #{order.id} -{" "}
                    {order.restaurantName}
                  </summary>

                  {order.deliveryAddress && (
                    <p>
                      Delivery: {order.deliveryAddress}
                    </p>
                  )}

                  <RefundedNotice payment={paymentsByOrder[order.id]} />

                  {openSummaries[order.id] && (
                    <OrderSummary
                      orderId={order.id}
                      onLog={onLog}
                    />
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
        <h2
          className={styles.sectionHead}
          style={{ margin: 0 }}
        >
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

      {error && !isNoCardError && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {cardNotice && (
        <NoticeModal
          title="Payment card required"
          message={cardNotice}
          actionLabel={paymentsEnabled ? "Go to Payments" : undefined}
          onAction={() => {
            setCardNotice("");
            setError("");
            setActiveTab("payments");
          }}
          onClose={() => {
            setCardNotice("");
            setError("");
          }}
        />
      )}

      {message && <p role="status">{message}</p>}

      <Tabs
        ariaLabel="Customer sections"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          {
            id: "restaurants",
            label: "Restaurants",
            content: restaurantsContent,
          },
          {
            id: "orders",
            label: "My Orders",
            badge: activeOrders.length || undefined,
            content: ordersContent,
          },
          {
            id: "history",
            label: "History",
            content: historyContent,
          },
          { id: "refunds", label: "Refunds", content: <RefundPanel onLog={onLog} /> },
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

      <ActiveOrdersBar
        orders={orders}
        onOpenOrder={openOrderFromBar}
      />
    </div>
  );
}
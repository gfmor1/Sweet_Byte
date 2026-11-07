"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import RestaurantList from "../features/customer/RestaurantList";
import PlaceOrder from "../features/customer/PlaceOrder";
import OrderSummary from "../features/pricing/OrderSummary";
import OrderHistory from "../features/pricing/OrderHistory";

import {
  getMenu,
  getRestaurants,
} from "../services/restaurantApi";

import {
  cancelOrder,
  getMyOrders,
  placeOrder,
} from "../services/orderApi";

import { formatEnum } from "../services/enumApi";

export default function CustomerDashboard({ onLog }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const mounted = useRef(false);
  const loading = useRef(false);
  const selection = useRef(null);
  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  const refresh = useCallback(async () => {
    if (loading.current) return;

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

      if (!mounted.current) return;

      setRestaurants(nextRestaurants);
      setOrders(nextOrders);

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
    } catch (err) {
      if (mounted.current) {
        setError(err.message);

        logCallback.current?.({
          command: "Refresh customer dashboard",
          error: err.message,
        });
      }
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
    } catch (err) {
      if (
        mounted.current &&
        selection.current === restaurant.id
      ) {
        setError(err.message);
      }

      onLog?.({
        command: "Browse menu",
        error: err.message,
      });
    }
  }

  async function handlePlaceOrder(items) {
    setError("");
    setMessage("");

    onLog?.({
      command: "Place Order",
      restaurantId: selectedRestaurant.id,
    });

    try {
      const order = await placeOrder(
        selectedRestaurant.id,
        items
      );

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

  function handleManualRefresh() {
    onLog?.({
      command: "Refresh customer dashboard",
    });

    refresh();
    setRefreshKey((previous) => previous + 1);
  }

  function backToRestaurants() {
    selection.current = null;
    setSelectedRestaurant(null);
  }

  return (
    <div className="dashboard">
      <h1>SweetByte</h1>
      <h2>Customer Dashboard</h2>

      <button
        disabled={refreshing}
        onClick={handleManualRefresh}
      >
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      {selectedRestaurant ? (
        <section>
          <button onClick={backToRestaurants}>
            Back to restaurants
          </button>

          <h2>{selectedRestaurant.name}</h2>

          <PlaceOrder
            key={selectedRestaurant.id}
            restaurant={selectedRestaurant}
            onPlaceOrder={handlePlaceOrder}
          />
        </section>
      ) : (
        <>
          {restaurants.length === 0 && !refreshing && (
            <p>No restaurants available.</p>
          )}

          <RestaurantList
            restaurants={restaurants}
            onSelect={selectRestaurant}
          />
        </>
      )}

      <section>
        <h2>My Orders</h2>

        {orders.length === 0 && (
          <p>You have no orders yet.</p>
        )}

        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <h3>Order #{order.id}</h3>

            <p>Restaurant: {order.restaurantName}</p>
            <p>Status: {formatEnum(order.status)}</p>

            {order.reason && (
              <p>Reason: {order.reason}</p>
            )}

            {order.items.map((item) => (
              <p key={item.id}>
                {item.name} × {item.quantity}
              </p>
            ))}

            {order.status === "PLACED" && (
              <button
                disabled={cancelling !== null}
                onClick={() => handleCancelOrder(order.id)}
              >
                {cancelling === order.id
                  ? "Cancelling..."
                  : "Cancel Order"}
              </button>
            )}

            {["DELIVERED", "REFUNDED"].includes(order.status) && (
              <>
                {order.status === "REFUNDED" && (
                  <p>
                    The refund appears separately in history.
                    This summary shows the original charge.
                  </p>
                )}

                <OrderSummary
                  orderId={order.id}
                  onLog={onLog}
                />
              </>
            )}
          </article>
        ))}
      </section>

      <OrderHistory
        refreshKey={refreshKey}
        onLog={onLog}
      />
    </div>
  );
}
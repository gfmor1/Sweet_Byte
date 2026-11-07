"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getOperatorDashboard,
  operatorEnabled,
  pauseRestaurant,
  reopenRestaurant,
  reassignOrder,
  refundOrder,
  resetSystem,
} from "../services/operatorApi";

import OrderHistory from "../features/pricing/OrderHistory";
import OrderSummary from "../features/pricing/OrderSummary";
import { formatEnum } from "../services/enumApi";

export default function OperatorDashboard({ user, onLog }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [confirmReset, setConfirmReset] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [summaryId, setSummaryId] = useState(null);

  const [historyVersion, setHistoryVersion] = useState(0);

  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const actionRunning = useRef(false);
  const logCallback = useRef(onLog);

  const isOperator = user?.role === "OPERATOR";

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  const loadDashboard = useCallback(async () => {
    if (!operatorEnabled || !isOperator) return;

    const version = ++requestVersion.current;

    if (mounted.current) {
      setLoading(true);
    }

    try {
      const data = await getOperatorDashboard();

      if (
        !Array.isArray(data.restaurants) ||
        !Array.isArray(data.orders)
      ) {
        throw new Error(
          "Operator response must contain restaurants and orders arrays."
        );
      }

      if (
        !mounted.current ||
        version !== requestVersion.current
      ) {
        return;
      }

      setRestaurants(data.restaurants);
      setOrders(data.orders);
      setError("");
    } catch (err) {
      if (
        mounted.current &&
        version === requestVersion.current
      ) {
        setError(err.message);

        logCallback.current?.({
          command: "Load operator dashboard",
          error: err.message,
        });
      }
    } finally {
      if (
        mounted.current &&
        version === requestVersion.current
      ) {
        setLoading(false);
      }
    }
  }, [isOperator]);

  useEffect(() => {
    mounted.current = true;

    setRestaurants([]);
    setOrders([]);
    setSummaryId(null);
    setRefundTarget(null);
    setConfirmReset(false);
    setMessage("");
    setError("");

    if (operatorEnabled && isOperator) {
      logCallback.current?.({
        command: "Load operator dashboard",
      });

      loadDashboard();
    }

    return () => {
      mounted.current = false;
      requestVersion.current += 1;
    };
  }, [loadDashboard, isOperator]);

  async function runCommand(command, action, successMessage) {
    if (
      actionRunning.current ||
      !operatorEnabled ||
      !isOperator
    ) {
      return;
    }

    actionRunning.current = true;

    setBusy(true);
    setError("");
    setMessage("");

    onLog?.({ command });

    try {
      await action();

      if (!mounted.current) return;

      setMessage(successMessage);
      setRefundTarget(null);
      setConfirmReset(false);
      setSummaryId(null);

      // Remount history after refunds, reassignment or Reset.
      setHistoryVersion((previous) => previous + 1);

      onLog?.({
        command,
        result: "Success",
      });

      await loadDashboard();
    } catch (err) {
      if (mounted.current) {
        setError(err.message);
      }

      onLog?.({
        command,
        error: err.message,
      });
    } finally {
      actionRunning.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  function handleRefresh() {
    onLog?.({
      command: "Refresh operator dashboard",
    });

    setSummaryId(null);
    setHistoryVersion((previous) => previous + 1);

    loadDashboard();
  }

  const controlsDisabled = busy || loading;

  if (!isOperator) {
    return (
      <p role="alert">
        An operator account is required to access this dashboard.
      </p>
    );
  }

  if (!operatorEnabled) {
    return (
      <div className="dashboard">
        <h1>SweetByte</h1>
        <h2>Operator Dashboard</h2>

        <p>
          Operator integration is not enabled yet.
          The operator backend endpoints must be connected first.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>SweetByte</h1>
      <h2>Operator Dashboard</h2>

      <p>
        Logged in as {user.name || user.email || "Operator"}
      </p>

      <button
        disabled={controlsDisabled}
        onClick={handleRefresh}
      >
        {loading ? "Refreshing..." : "Refresh dashboard"}
      </button>

      {busy && (
        <p role="status">Processing command...</p>
      )}

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {message && (
        <p role="status">{message}</p>
      )}

      <section>
        <h2>Restaurants</h2>

        {!loading && restaurants.length === 0 && (
          <p>No restaurants available.</p>
        )}

        {restaurants.map((restaurant) => (
          <article
            key={restaurant.id}
            className="order-card"
          >
            <h3>{restaurant.name}</h3>

            <p>Status: {formatEnum(restaurant.status)}</p>

            {restaurant.status === "OPEN" ? (
              <button
                disabled={controlsDisabled}
                onClick={() =>
                  runCommand(
                    `Pause restaurant #${restaurant.id}`,
                    () => pauseRestaurant(restaurant.id),
                    `${restaurant.name} paused.`
                  )
                }
              >
                Pause restaurant
              </button>
            ) : (
              <button
                disabled={controlsDisabled}
                onClick={() =>
                  runCommand(
                    `Reopen restaurant #${restaurant.id}`,
                    () => reopenRestaurant(restaurant.id),
                    `${restaurant.name} reopened.`
                  )
                }
              >
                Reopen restaurant
              </button>
            )}
          </article>
        ))}
      </section>

      <section>
        <h2>All Orders</h2>

        {!loading && orders.length === 0 && (
          <p>No orders available.</p>
        )}

        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <h3>Order #{order.id}</h3>

            <p>Restaurant: {order.restaurantName}</p>
            <p>Customer: {order.customerName || "Unavailable"}</p>
            <p>Status: {formatEnum(order.status)}</p>

            <p>
              Assigned courier: {order.courierId ?? "None"}
            </p>

            {order.reason && (
              <p>Reason: {order.reason}</p>
            )}

            {(order.items || []).map((item) => (
              <p key={item.id}>
                {item.name} × {item.quantity}
              </p>
            ))}

            {order.canReassign === true && (
              <div>
                <p>
                  This order is stalled and eligible for reassignment.
                </p>

                <button
                  disabled={controlsDisabled}
                  onClick={() =>
                    runCommand(
                      `Reassign order #${order.id}`,
                      () => reassignOrder(order.id),
                      `Reassignment requested for order #${order.id}.`
                    )
                  }
                >
                  Reassign order
                </button>
              </div>
            )}

            {order.status === "DELIVERED" && (
              <div>
                {refundTarget === order.id ? (
                  <>
                    <p>
                      Refund delivered order #{order.id}?
                    </p>

                    <button
                      disabled={controlsDisabled}
                      onClick={() =>
                        runCommand(
                          `Refund order #${order.id}`,
                          () => refundOrder(order.id),
                          `Order #${order.id} refunded.`
                        )
                      }
                    >
                      Confirm refund
                    </button>

                    <button
                      disabled={controlsDisabled}
                      onClick={() => setRefundTarget(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    disabled={controlsDisabled}
                    onClick={() => setRefundTarget(order.id)}
                  >
                    Refund order
                  </button>
                )}
              </div>
            )}

            {order.status === "REFUNDED" && (
              <p>
                Refunded. The original charge remains in the ledger.
              </p>
            )}

            {["DELIVERED", "REFUNDED"].includes(order.status) && (
              <>
                <button
                  disabled={controlsDisabled}
                  onClick={() =>
                    setSummaryId((previous) =>
                      previous === order.id ? null : order.id
                    )
                  }
                >
                  {summaryId === order.id
                    ? "Hide summary"
                    : "View order summary"}
                </button>

                {summaryId === order.id && (
                  <OrderSummary
                    orderId={order.id}
                    onLog={onLog}
                  />
                )}
              </>
            )}
          </article>
        ))}
      </section>

      <OrderHistory
        key={historyVersion}
        onLog={onLog}
      />

      <section>
        <h2>Reset Simulator</h2>

        <p>
          Restore the initial restaurants, menus, couriers,
          orders and billing records from the configured seed.
        </p>

        {confirmReset ? (
          <>
            <p>
              Current simulator changes will be discarded.
              Restore the initial state?
            </p>

            <button
              disabled={controlsDisabled}
              onClick={() =>
                runCommand(
                  "Reset simulator",
                  resetSystem,
                  "Simulator restored to its initial state."
                )
              }
            >
              Confirm Reset
            </button>

            <button
              disabled={controlsDisabled}
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            disabled={controlsDisabled}
            onClick={() => setConfirmReset(true)}
          >
            Reset simulator
          </button>
        )}
      </section>
    </div>
  );
}
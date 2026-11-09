"use client";

import { useEffect, useRef, useState } from "react";

import QueueBadge from "../shared/QueueBadge";
import { formatEnum } from "../../services/enumApi";
import { getOperatorDashboard, pauseRestaurant, reopenRestaurant } from "../../services/operatorApi";
import { getRestaurantOrders } from "../../services/orderApi";
import { can, explain } from "../../services/permissions";
import { changeRestaurantStatus } from "../../services/restaurantApi";

const POLL_MS = 5000;
const OPEN_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

async function loadOrders(role, restaurantId) {
  if (role === "RESTAURANT_OWNER") return getRestaurantOrders(restaurantId);
  const { orders } = await getOperatorDashboard();
  return orders.filter((order) => String(order.restaurantId) === String(restaurantId));
}

// Details of the restaurant selected on the map: quick stats, order queue and role-permitted actions.
// Orders are shown to the operator and the restaurant's own owner only.
export default function RestaurantDetails({ restaurant, user, onClose, onLog, onViewMenu }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const logRef = useRef(onLog);
  logRef.current = onLog;
  const lastError = useRef("");

  const role = user.role;
  const owns = role === "RESTAURANT_OWNER" && String(user.restaurantId) === String(restaurant.id);
  const isStaff = role === "OPERATOR" || owns;

  useEffect(() => {
    if (!isStaff) return undefined;
    let active = true;
    setOrders([]);

    async function load() {
      try {
        const list = await loadOrders(role, restaurant.id);
        if (!active) return;
        setOrders(list);
        setError("");
        lastError.current = "";
      } catch (err) {
        if (!active) return;
        setError(err.message);
        if (lastError.current !== err.message) {
          lastError.current = err.message;
          logRef.current?.({ command: "Load restaurant details", error: err.message });
        }
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isStaff, role, restaurant.id]);

  async function changeStatus(command, action) {
    setBusy(true);
    setError("");
    logRef.current?.({ command });
    try {
      await action();
      logRef.current?.({ command, result: "Success" });
    } catch (err) {
      setError(err.message);
      logRef.current?.({ command, error: err.message });
    } finally {
      setBusy(false);
    }
  }

  function setStatus(target) {
    if (role === "OPERATOR") return target === "PAUSED" ? pauseRestaurant(restaurant.id) : reopenRestaurant(restaurant.id);
    return changeRestaurantStatus(restaurant.id, target);
  }

  const ctx = { restaurantStatus: restaurant.status };
  const count = (...statuses) => orders.filter((order) => statuses.includes(order.status)).length;
  const queue = orders
    .filter((order) => OPEN_STATUSES.includes(order.status))
    .sort((a, b) => Number(a.id) - Number(b.id));

  function statusButton(command, label, target) {
    const allowed = can(role, command, ctx) && !busy;
    return (
      <button
        type="button"
        className="btn-secondary"
        disabled={!allowed}
        title={explain(role, command, ctx) || undefined}
        onClick={() => changeStatus(`${label} restaurant #${restaurant.id}`, () => setStatus(target))}
      >
        {label}
      </button>
    );
  }

  return (
    <section className="card" aria-label="Selected restaurant" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{restaurant.name}</h2>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <p style={{ margin: "0.25rem 0" }}>
        <span className="chip">{formatEnum(restaurant.status)}</span>{" "}
        <QueueBadge size={restaurant.queueSize} status={restaurant.status} />
      </p>

      {isStaff && (
        <>
          <p style={{ margin: "0.25rem 0" }}>
            Queued: {count("PLACED", "ACCEPTED")} | In preparation: {count("PREPARING")} | Ready: {count("READY")}
          </p>
          {queue.length === 0 ? (
            <p style={{ margin: "0.25rem 0" }}>No open orders.</p>
          ) : (
            <ol style={{ margin: "0.25rem 0", paddingLeft: "1.25rem" }}>
              {queue.map((order) => (
                <li key={order.id}>
                  Order #{order.id}: {formatEnum(order.status)}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {error && <p role="alert">{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {isStaff && restaurant.status === "OPEN" && statusButton("pauseRestaurant", "Pause", "PAUSED")}
        {isStaff && restaurant.status === "PAUSED" && statusButton("reopenRestaurant", "Reopen", "OPEN")}
        {role === "CUSTOMER" && onViewMenu && (
          <button type="button" className="btn-secondary" onClick={() => onViewMenu(restaurant)}>
            View menu
          </button>
        )}
      </div>
    </section>
  );
}

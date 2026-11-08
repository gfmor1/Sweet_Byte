"use client";

import { can, explain } from "../../services/permissions";
import { formatEnum } from "../../services/enumApi";
import OrderSummary from "../pricing/OrderSummary";
import OrderFare from "../pricing/OrderFare";
import { courierText } from "./normalizeCourier";
import styles from "./customer.module.css";

export const ACTIVE_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
];

export const PROGRESS_STEPS = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "DELIVERED",
];

const TERMINAL = ["REJECTED", "CANCELLED", "REFUNDED"];

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export function OrderTimeline({ status }) {
  // A refunded order was delivered first.
  const effective = status === "REFUNDED" ? "DELIVERED" : status;
  const currentIndex = PROGRESS_STEPS.indexOf(effective);
  const finished = effective === "DELIVERED";

  return (
    <ol className={styles.timeline} aria-label="Order progress">
      {PROGRESS_STEPS.map((step, index) => {
        const done = index < currentIndex || (finished && index === currentIndex);
        const current = index === currentIndex && !finished;
        const state = done ? "done" : current ? "current" : "upcoming";

        return (
          <li
            key={step}
            className={`${styles.step} ${
              done ? styles.stepDone : current ? styles.stepCurrent : ""
            }`}
            aria-current={current ? "step" : undefined}
          >
            {formatEnum(step)}
            <span style={{ position: "absolute", left: "-9999px" }}>
              {" "}
              ({state})
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderTracker({
  order,
  role = "CUSTOMER",
  cancelling,
  onCancel,
  onLog,
  selected = false,
  onSelect,
}) {
  const courierLine = ACTIVE_STATUSES.includes(order.status)
    ? courierText(order)
    : null;
  const hasRestaurantPoint = ACTIVE_STATUSES.includes(order.status);
  const terminal = TERMINAL.includes(order.status);
  const cancelReason = explain(role, "cancelOrder", {
    orderStatus: order.status,
  });
  const canCancel = can(role, "cancelOrder", { orderStatus: order.status });
  const delivered = ["DELIVERED", "REFUNDED"].includes(order.status);
  const rejectedOrCancelled = ["REJECTED", "CANCELLED"].includes(
    order.status
  );

  const times = [
    ["Placed", formatTime(order.placedAt)],
    ["Accepted", formatTime(order.acceptedAt)],
    ["Ready", formatTime(order.readyAt)],
    ["Delivered", formatTime(order.deliveredAt)],
  ].filter(([, value]) => value);

  return (
    <li
      id={`order-${order.id}-card`}
      className={`card ${styles.card} ${selected ? styles.cardSelected : ""}`}
    >
      <article aria-labelledby={`order-${order.id}-title`}>
        <h3 id={`order-${order.id}-title`} className={styles.cardTitle}>
          Order #{order.id}
        </h3>

        <p className={styles.meta}>
          {order.restaurantName} - Status:{" "}
          <strong>{formatEnum(order.status)}</strong>
        </p>

        {!rejectedOrCancelled && <OrderTimeline status={order.status} />}

        {courierLine && (
          <p className={styles.courierLine} role="status">
            {courierLine}
          </p>
        )}

        {hasRestaurantPoint && onSelect && (
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={selected}
            onClick={() => onSelect(selected ? null : order.id)}
          >
            {selected ? "Hide from map" : "Show on map"}
          </button>
        )}

        {terminal && (
          <p
            className={`${styles.terminal} ${
              order.status === "REFUNDED" ? styles.terminalRefund : ""
            }`}
            role="status"
          >
            {formatEnum(order.status)}
            {order.reason ? `: ${order.reason}` : ""}
            {order.status === "REFUNDED" &&
              ". The refund appears separately in history; the summary below shows the original charge."}
          </p>
        )}

        {!terminal && order.reason && (
          <p className={styles.meta}>Reason: {order.reason}</p>
        )}

        <ul className={styles.items}>
          {order.items.map((item) => (
            <li key={item.id}>
              {item.name} x {item.quantity}
            </li>
          ))}
        </ul>

        {times.length > 0 && (
          <p className={styles.meta}>
            {times.map(([label, value]) => `${label}: ${value}`).join(" | ")}
          </p>
        )}

        {order.status === "PLACED" ? (
          <button
            className="btn-danger"
            disabled={cancelling !== null || !canCancel}
            onClick={() => onCancel(order.id)}
          >
            {cancelling === order.id ? "Cancelling..." : "Cancel Order"}
          </button>
        ) : (
          !terminal &&
          !delivered && (
            <p className={styles.meta}>
              Cancel unavailable: {cancelReason}
            </p>
          )
        )}

        {delivered ? (
          <OrderSummary orderId={order.id} onLog={onLog} />
        ) : (
          !rejectedOrCancelled && (
            <details>
              <summary>Price breakdown</summary>
              <OrderFare orderId={order.id} onLog={onLog} />
            </details>
          )
        )}
      </article>
    </li>
  );
}

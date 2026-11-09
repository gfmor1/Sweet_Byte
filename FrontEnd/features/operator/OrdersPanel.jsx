"use client";

import { useState } from "react";

import OrderSummary from "../pricing/OrderSummary";
import StatusPill from "./StatusPill";
import { can, explain } from "../../services/permissions";
import { formatEnum } from "../../services/enumApi";
import styles from "./operator.module.css";

function matches(order, q) {
  if (!q) return true;
  const hay = [
    `#${order.id}`,
    order.id,
    order.restaurantName,
    order.customerName,
    order.courierId,
    order.status,
    ...(order.items || []).map((i) => i.name),
  ]
    .filter((x) => x !== undefined && x !== null)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

// All orders. Reassign only for stalled orders, Refund only for DELIVERED (with confirm).
// The operator cannot place, prepare or deliver orders, so no such controls exist here.
export default function OrdersPanel({ orders, loaded, disabled, onReassign, onRefund, onLog }) {
  const [refundTarget, setRefundTarget] = useState(null);
  const [summaryId, setSummaryId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");

  const isStalled = (o) => o.canReassign === true;
  const statuses = [...new Set(orders.map((o) => o.status))];
  const stalledCount = orders.filter(isStalled).length;

  const q = query.trim().toLowerCase();
  const shown = orders
    .filter((o) => {
      if (filter === "STALLED") return isStalled(o);
      if (filter !== "ALL") return o.status === filter;
      return true;
    })
    .filter((o) => matches(o, q))
    .sort((a, b) => {
      const d = Number(isStalled(b)) - Number(isStalled(a));
      if (d !== 0) return d;
      return Number(b.id) - Number(a.id);
    });

  const chips = [
    { id: "ALL", label: `All ${orders.length}` },
    ...(stalledCount > 0 ? [{ id: "STALLED", label: `Stalled ${stalledCount}` }] : []),
    ...statuses.map((s) => ({
      id: s,
      label: `${formatEnum(s)} ${orders.filter((o) => o.status === s).length}`,
    })),
  ];

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>All orders</h2>
        <span className={`${styles.pill} ${styles.pillCount}`}>{orders.length}</span>
      </div>

      <input
        type="search"
        className={styles.search}
        placeholder="Search by order, restaurant, customer, courier or item"
        aria-label="Search orders"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={styles.filters} role="group" aria-label="Filter orders by status">
        {chips.map((c) => (
          <button
            key={c.id}
            className={`${styles.chip} ${filter === c.id ? styles.chipActive : ""}`}
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loaded && orders.length === 0 && <p className={styles.empty}>No orders available.</p>}
      {loaded && orders.length > 0 && shown.length === 0 && (
        <p className={styles.empty}>No orders match your search.</p>
      )}

      <div className={styles.grid}>
        {shown.map((order) => {
          const stalled = isStalled(order);
          const reassignCtx = { stalled };
          const refundCtx = { orderStatus: order.status };
          const reassignReason = explain("OPERATOR", "reassignOrder", reassignCtx);
          const refundReason = explain("OPERATOR", "refundOrder", refundCtx);
          const confirming = refundTarget === order.id && order.status === "DELIVERED";
          const delivered = order.status === "DELIVERED";
          const hasSummary = ["DELIVERED", "REFUNDED"].includes(order.status);

          return (
            <article key={order.id} className={`${styles.card} ${stalled ? styles.stalled : ""}`}>
              <div className={styles.orderHead}>
                <h3>Order #{order.id}</h3>
                <StatusPill status={order.status} />
                {stalled && <span className={styles.stalledTag}>Stalled: courier offline</span>}
              </div>
              <div className={styles.meta}>
                <span>{order.restaurantName}</span>
                <span>Customer: {order.customerName || "Unavailable"}</span>
                <span>Courier: {order.courierId ?? "None"}</span>
              </div>
              {order.reason && <p className={styles.meta}>Reason: {order.reason}</p>}
              {(order.items || []).length > 0 && (
                <p className={styles.items}>
                  {(order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(", ")}
                </p>
              )}

              {(stalled || delivered || hasSummary) && (
                <div className={styles.actions}>
                  {stalled && (
                    <button
                      className={styles.btn}
                      disabled={disabled || !can("OPERATOR", "reassignOrder", reassignCtx)}
                      title={reassignReason || undefined}
                      onClick={() => onReassign(order)}
                    >
                      Reassign
                    </button>
                  )}

                  {delivered &&
                    (confirming ? (
                      <>
                        <span className={styles.muted}>Refund delivered order #{order.id}?</span>
                        <button
                          className={`${styles.btn} ${styles.btnSolidDanger}`}
                          disabled={disabled || !can("OPERATOR", "refundOrder", refundCtx)}
                          onClick={() => {
                            setRefundTarget(null);
                            onRefund(order);
                          }}
                        >
                          Confirm refund
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnGhost}`}
                          disabled={disabled}
                          onClick={() => setRefundTarget(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        disabled={disabled || !can("OPERATOR", "refundOrder", refundCtx)}
                        title={refundReason || undefined}
                        onClick={() => setRefundTarget(order.id)}
                      >
                        Refund
                      </button>
                    ))}

                  {hasSummary && (
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => setSummaryId((prev) => (prev === order.id ? null : order.id))}
                    >
                      {summaryId === order.id ? "Hide summary" : "Order summary"}
                    </button>
                  )}
                </div>
              )}

              {order.status === "REFUNDED" && (
                <p className={styles.muted}>Refunded. The original charge remains in the ledger.</p>
              )}

              {hasSummary && summaryId === order.id && (
                <OrderSummary orderId={order.id} onLog={onLog} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

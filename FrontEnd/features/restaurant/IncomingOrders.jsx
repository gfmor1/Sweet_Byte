"use client";

import { useState } from "react";
import { formatEnum } from "../../services/enumApi";
import { can, explain, ROLES } from "../../services/permissions";
import styles from "./restaurant.module.css";

const ROLE = ROLES.RESTAURANT_OWNER;

function IncomingOrderCard({ order, busy, onAccept, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const ctx = { orderStatus: order.status };
  const acceptBlocked = explain(ROLE, "acceptOrder", ctx);
  const rejectBlocked = explain(ROLE, "rejectOrder", ctx);
  const busyHint = busy ? "Another action is in progress." : undefined;
  const reasonId = `reject-reason-${order.id}`;

  function cancelReject() {
    setRejecting(false);
    setReason("");
    setReasonError("");
  }

  async function handleReject(event) {
    event.preventDefault();

    const trimmed = reason.trim();
    if (trimmed === "") {
      setReasonError("Enter a reason to reject this order.");
      return;
    }

    setReasonError("");
    const ok = await onReject(order.id, trimmed);
    if (ok) cancelReject();
  }

  return (
    <li className={`card order-card ${styles.card}`}>
      <div className={styles.cardHead}>
        <h4 className={styles.cardTitle}>Order #{order.id}</h4>
        <span className="chip">{formatEnum(order.status)}</span>
      </div>

      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={item.id}>
            {item.name} <span className={styles.qty}>x {item.quantity}</span>
          </li>
        ))}
      </ul>

      {rejecting ? (
        <form onSubmit={handleReject} noValidate className={styles.rejectForm}>
          <div className={styles.field}>
            <label htmlFor={reasonId}>Rejection reason (required)</label>
            <input
              id={reasonId}
              type="text"
              autoFocus
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError("");
              }}
              aria-invalid={reasonError ? "true" : undefined}
              aria-describedby={reasonError ? `${reasonId}-error` : undefined}
              placeholder="e.g. Out of ingredients"
            />
            {reasonError && (
              <p id={`${reasonId}-error`} className={styles.fieldError} role="alert">
                {reasonError}
              </p>
            )}
          </div>
          <div className={styles.actionRow}>
            <button
              type="submit"
              className="btn-danger"
              disabled={!can(ROLE, "rejectOrder", ctx) || busy}
              title={rejectBlocked || busyHint}
            >
              Confirm reject
            </button>
            <button type="button" className="btn-secondary" onClick={cancelReject}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={() => onAccept(order.id)}
            disabled={!can(ROLE, "acceptOrder", ctx) || busy}
            title={acceptBlocked || busyHint}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={() => setRejecting(true)}
            disabled={!can(ROLE, "rejectOrder", ctx) || busy}
            title={rejectBlocked || busyHint}
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

function IncomingOrders({ orders, busy, onAccept, onReject }) {
  const incoming = orders.filter((order) => order.status === "PLACED");

  return (
    <section className={styles.section} aria-label="Incoming orders">
      {incoming.length === 0 ? (
        <p className={styles.empty}>No incoming orders. New orders appear here automatically.</p>
      ) : (
        <ul className={styles.cards}>
          {incoming.map((order) => (
            <IncomingOrderCard
              key={order.id}
              order={order}
              busy={busy}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default IncomingOrders;

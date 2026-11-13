"use client";

import { useState } from "react";

import { REFUND_REASONS } from "../../services/config";
import { formatEnum } from "../../services/enumApi";
import { can, explain } from "../../services/permissions";
import styles from "./operator.module.css";

// Operator side of UC-PRC-06/07: pending requests first, each decided once.
// onDecline(request, note): the note is required and shown to the customer.
export default function RefundReviewPanel({ requests, loaded, disabled, onAccept, onDecline }) {
  const [notes, setNotes] = useState({});
  const sorted = [...requests].sort(
    (a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING") || b.id - a.id
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Refund requests</h2>
        <span className={`${styles.pill} ${styles.pillCount}`}>{requests.length}</span>
      </div>

      {loaded && requests.length === 0 && <p className={styles.empty}>No refund requests.</p>}

      <div className={styles.grid}>
        {sorted.map((request) => {
          const ctx = { requestStatus: request.status };
          const allowed = can("OPERATOR", "acceptRefund", ctx) && !disabled;
          const reason = explain("OPERATOR", "acceptRefund", ctx);
          const note = notes[request.id] || "";

          return (
            <article key={request.id} className={styles.card}>
              <div className={styles.orderHead}>
                <h3>Order #{request.orderId}</h3>
                <span className={`${styles.pill} ${styles.pillCount}`}>{formatEnum(request.status)}</span>
              </div>
              <div className={styles.meta}>
                {request.restaurantName && <span>{request.restaurantName}</span>}
                {request.orderStatus && <span>Order status: {formatEnum(request.orderStatus)}</span>}
              </div>
              <p className={styles.items}>{REFUND_REASONS[request.reason] || request.reason}</p>
              {request.proof && <p className={styles.meta}>Proof: {request.proof}</p>}
              {request.operatorNote && <p className={styles.meta}>Note: {request.operatorNote}</p>}

              {request.status === "PENDING" && (
                <label className={styles.meta} style={{ display: "block" }}>
                  Reason for declining
                  <textarea
                    value={note}
                    onChange={(event) => setNotes({ ...notes, [request.id]: event.target.value })}
                    placeholder="Shown to the customer"
                    disabled={disabled}
                    style={{ display: "block", width: "100%" }}
                  />
                </label>
              )}

              {request.status === "PENDING" && (
                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={!allowed}
                    title={reason || undefined}
                    onClick={() => onAccept(request)}
                  >
                    Accept refund
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnGhost}`}
                    disabled={!allowed || !note.trim()}
                    title={reason || (!note.trim() ? "Write a reason for declining first." : undefined)}
                    onClick={() => onDecline(request, note.trim())}
                  >
                    Decline
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

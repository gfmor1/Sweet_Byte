"use client";

import { REFUND_REASONS } from "../../services/config";
import { formatEnum } from "../../services/enumApi";
import { can, explain } from "../../services/permissions";
import styles from "./operator.module.css";

// Operator side of UC-PRC-06/07: pending requests first, each decided once.
export default function RefundReviewPanel({ requests, loaded, disabled, onAccept, onDecline }) {
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

          return (
            <article key={request.id} className={styles.card}>
              <div className={styles.orderHead}>
                <h3>Order #{request.orderId}</h3>
                <span className={`${styles.pill} ${styles.pillCount}`}>{formatEnum(request.status)}</span>
              </div>
              <div className={styles.meta}>
                <span>{request.restaurantName}</span>
                <span>Order status: {formatEnum(request.orderStatus)}</span>
              </div>
              <p className={styles.items}>{REFUND_REASONS[request.reason] || request.reason}</p>
              <p className={styles.meta}>Proof: {request.proof}</p>

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
                    disabled={!allowed}
                    title={reason || undefined}
                    onClick={() => onDecline(request)}
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

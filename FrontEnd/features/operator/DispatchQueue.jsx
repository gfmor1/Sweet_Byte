"use client";

import QueueBadge from "../shared/QueueBadge";
import styles from "./operator.module.css";

function waited(seconds) {
  if (typeof seconds !== "number") return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Ready orders waiting for a courier, oldest first (server order is trusted).
export default function DispatchQueue({ queue, loaded }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Dispatch queue</h2>
        <QueueBadge size={queue.length} />
      </div>
      {loaded && queue.length === 0 ? (
        <p className={styles.empty}>No orders waiting for a courier.</p>
      ) : (
        <ol className={styles.queueList}>
          {queue.map((q, i) => (
            <li key={q.orderId} className={styles.queueItem}>
              <span>
                <strong>
                  {i + 1}. Order #{q.orderId}
                </strong>
                {q.restaurantName ? ` from ${q.restaurantName}` : ""}
              </span>
              {typeof q.waitingSeconds === "number" && (
                <span className={styles.muted}>waiting {waited(q.waitingSeconds)}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

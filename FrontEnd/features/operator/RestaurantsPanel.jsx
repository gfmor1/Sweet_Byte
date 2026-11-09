"use client";

import QueueBadge from "../shared/QueueBadge";
import StatusPill from "./StatusPill";
import { can, explain } from "../../services/permissions";
import styles from "./operator.module.css";

// Restaurants: OPEN first, then A-Z. Shows only the pause/reopen action valid for the status;
// permissions decide enabled state and tooltip.
export default function RestaurantsPanel({ restaurants, orders, loaded, disabled, onPause, onReopen }) {
  const active = ["PLACED", "ACCEPTED", "PREPARING"];
  function queueFor(r) {
    if (typeof r.queueSize === "number") return r.queueSize;
    return orders.filter((o) => o.restaurantId === r.id && active.includes(o.status)).length;
  }

  const sorted = [...restaurants].sort((a, b) => {
    const ao = a.status === "OPEN" ? 0 : 1;
    const bo = b.status === "OPEN" ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Restaurants</h2>
        <span className={`${styles.pill} ${styles.pillCount}`}>{restaurants.length}</span>
      </div>
      {loaded && restaurants.length === 0 && <p className={styles.empty}>No restaurants available.</p>}
      <div className={styles.grid}>
        {sorted.map((r) => {
          const ctx = { restaurantStatus: r.status };
          const canPause = can("OPERATOR", "pauseRestaurant", ctx);
          const showPause = canPause || r.status === "OPEN";
          const reason = explain("OPERATOR", showPause ? "pauseRestaurant" : "reopenRestaurant", ctx);
          const allowed = can("OPERATOR", showPause ? "pauseRestaurant" : "reopenRestaurant", ctx);
          return (
            <article key={r.id} className={styles.card}>
              <div className={styles.row}>
                <h3 className={styles.sectionTitle}>{r.name}</h3>
                <StatusPill status={r.status} />
              </div>
              <QueueBadge size={queueFor(r)} status={r.status} />
              <div className={styles.actions}>
                <button
                  className={styles.btn}
                  disabled={disabled || !allowed}
                  title={reason || undefined}
                  onClick={() => (showPause ? onPause(r) : onReopen(r))}
                >
                  {showPause ? "Pause" : "Reopen"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

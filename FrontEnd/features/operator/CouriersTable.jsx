"use client";

import StatusPill from "./StatusPill";
import styles from "./operator.module.css";

const ORDER = ["IDLE", "ASSIGNED", "CARRYING", "OFFLINE"];

function fmt(n) {
  return typeof n === "number" ? n.toFixed(4) : null;
}

function rank(status) {
  const i = ORDER.indexOf(status);
  return i === -1 ? ORDER.length : i;
}

// Couriers sorted by status, then id. Table on wide screens, stacked cards on narrow ones.
export default function CouriersTable({ couriers, loaded }) {
  const sorted = [...couriers].sort((a, b) => {
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return Number(a.id) - Number(b.id) || String(a.id).localeCompare(String(b.id));
  });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Couriers</h2>
        <span className={`${styles.pill} ${styles.pillCount}`}>{couriers.length}</span>
      </div>
      {loaded && couriers.length === 0 ? (
        <p className={styles.empty}>No couriers available.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const lat = fmt(c.latitude);
                const lng = fmt(c.longitude);
                return (
                  <tr key={c.id}>
                    <td data-label="ID">{c.id}</td>
                    <td data-label="Name">{c.name}</td>
                    <td data-label="Status">
                      <StatusPill status={c.status} />
                    </td>
                    <td data-label="Location">{lat && lng ? `${lat}, ${lng}` : "Unknown"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

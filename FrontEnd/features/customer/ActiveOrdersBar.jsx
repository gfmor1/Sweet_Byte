"use client";

import { formatEnum } from "../../services/enumApi";
import { ACTIVE_STATUSES } from "./OrderTracker";
import styles from "./customer.module.css";

// Sticky summary of in-flight orders. Not a cart.
export default function ActiveOrdersBar({ orders, onOpenOrder }) {
  const active = orders
    .filter((order) => ACTIVE_STATUSES.includes(order.status))
    .sort((a, b) => Number(b.id) - Number(a.id));

  if (active.length === 0) return null;

  return (
    <nav className={styles.activeBar} aria-label="Active orders">
      <p className={styles.activeBarTitle}>
        Active orders ({active.length})
      </p>

      <ul className={styles.activeList}>
        {active.map((order) => {
          const index = ACTIVE_STATUSES.indexOf(order.status);
          const percent = ((index + 1) / (ACTIVE_STATUSES.length + 1)) * 100;

          return (
            <li key={order.id}>
              <button
                type="button"
                className={styles.activeChip}
                onClick={() => onOpenOrder(order.id)}
                aria-label={`Order ${order.id}, ${formatEnum(
                  order.status
                )}. Open in My Orders`}
              >
                <span>
                  #{order.id} {formatEnum(order.status)}
                </span>
                <span className={styles.miniProgress} aria-hidden="true">
                  <span
                    className={styles.miniFill}
                    style={{ width: `${percent}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

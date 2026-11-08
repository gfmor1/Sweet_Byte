import { formatEnum } from "../../services/enumApi";
import styles from "./restaurant.module.css";

const HANDOFF_STATUSES = ["READY", "PICKED_UP", "DELIVERED"];
const MAX_DELIVERED_SHOWN = 5;

const MESSAGES = {
  READY: "Awaiting courier dispatch / pickup.",
  PICKED_UP: "Picked up by a courier and on its way.",
  DELIVERED: "Delivered to the customer."
};

// Orders that left the kitchen, and where they are in the courier hand-off
function DispatchStatus({ orders }) {
  const active = orders.filter(
    (order) => order.status === "READY" || order.status === "PICKED_UP"
  );
  const delivered = orders
    .filter((order) => order.status === "DELIVERED")
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, MAX_DELIVERED_SHOWN);
  const shown = [...active, ...delivered].filter((order) =>
    HANDOFF_STATUSES.includes(order.status)
  );

  return (
    <section className={styles.section} aria-labelledby="dispatch-heading">
      <h3 id="dispatch-heading" className={styles.sectionTitle}>
        Courier Hand-off
      </h3>

      {shown.length === 0 ? (
        <p className={styles.empty}>
          No orders waiting for a courier. Orders marked ready appear here.
        </p>
      ) : (
        <ul className={styles.handoffList}>
          {shown.map((order) => (
            <li key={order.id} className={`card order-card ${styles.handoffRow}`}>
              <strong>Order #{order.id}</strong>
              <span className={`${styles.badge} ${styles[order.status]}`}>
                {formatEnum(order.status)}
              </span>
              <span className={styles.meta}>{MESSAGES[order.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DispatchStatus;

import { formatEnum } from "../../services/enumApi";
import { can, explain, ROLES } from "../../services/permissions";
import QueueBadge from "../shared/QueueBadge";
import styles from "./restaurant.module.css";

const ROLE = ROLES.RESTAURANT_OWNER;
// READY orders have left the kitchen; they are shown in DispatchStatus
const QUEUE_STATUSES = ["ACCEPTED", "PREPARING"];

function OrderQueue({ orders, busy, queueSize, onStartPreparing, onMarkReady }) {
  // FIFO: oldest accepted order first
  const queue = orders
    .filter((order) => QUEUE_STATUSES.includes(order.status))
    .sort((a, b) => (a.acceptedAt ?? 0) - (b.acceptedAt ?? 0));

  // Only the oldest order still waiting may start preparing
  const nextOrder = queue.find((order) => order.status === "ACCEPTED");
  const busyHint = busy ? "Another action is in progress." : undefined;

  return (
    <section className={styles.section} aria-labelledby="queue-heading">
      <h3 id="queue-heading" className={styles.sectionTitle}>
        Preparation Queue <QueueBadge size={queueSize ?? queue.length} />
      </h3>

      {queue.length === 0 ? (
        <p className={styles.empty}>No accepted orders in the queue.</p>
      ) : (
        <ul className={styles.cards}>
          {queue.map((order, index) => {
            const ctx = { orderStatus: order.status };
            const startBlocked =
              explain(ROLE, "startPreparing", ctx) ||
              (order !== nextOrder
                ? "An older accepted order must start preparing first."
                : null);
            const readyBlocked = explain(ROLE, "markReady", ctx);

            return (
              <li key={order.id} className={`card order-card ${styles.card}`}>
                <div className={styles.cardHead}>
                  <h4 className={styles.cardTitle}>
                    #{index + 1} in queue: Order #{order.id}
                  </h4>
                  <span className="chip">{formatEnum(order.status)}</span>
                </div>

                <ul className={styles.items}>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.name} <span className={styles.qty}>x {item.quantity}</span>
                    </li>
                  ))}
                </ul>

                <div className={styles.actionRow}>
                  {order.status === "ACCEPTED" && (
                    <button
                      type="button"
                      className={`btn-secondary ${styles.smallBtn}`}
                      onClick={() => onStartPreparing(order.id)}
                      disabled={
                        !can(ROLE, "startPreparing", ctx) || order !== nextOrder || busy
                      }
                      title={startBlocked || busyHint}
                    >
                      Start Preparing
                    </button>
                  )}

                  {order.status === "PREPARING" && (
                    <button
                      type="button"
                      className={`btn-secondary ${styles.smallBtn}`}
                      onClick={() => onMarkReady(order.id)}
                      disabled={!can(ROLE, "markReady", ctx) || busy}
                      title={readyBlocked || busyHint}
                    >
                      Mark Ready
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default OrderQueue;

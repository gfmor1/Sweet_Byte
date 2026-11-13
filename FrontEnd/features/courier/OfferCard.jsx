import { formatEnum } from "../../services/enumApi";
import styles from "./courier.module.css";

const STEPS = ["Offered", "Accepted", "Picked up", "Delivered"];

function formatCoords(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return "Unknown";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function currentStep(offer) {
  if (offer.courierStatus === "CARRYING" || offer.orderStatus === "PICKED_UP") return 2;
  if (offer.accepted) return 1;
  return 0;
}

function Steps({ active }) {
  return (
    <ol className={styles.steps} aria-label="Delivery progress">
      {STEPS.map((label, i) => {
        const state = i < active ? styles.stepDone : i === active ? styles.stepActive : "";
        return (
          <li
            key={label}
            className={`${styles.step} ${state}`}
            aria-current={i === active ? "step" : undefined}
          >
            <span className={styles.stepDot}>{i < active ? "✓" : i + 1}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Shows order details only; never any customer payment information.
// `children` holds the delivery action buttons.
export default function OfferCard({ offer, children }) {
  if (!offer) {
    return (
      <section className={`card ${styles.panel}`} aria-label="Current order">
        <h2 className={styles.panelTitle}>Order</h2>
        <p className={styles.empty}>
          No order yet, you will be offered the nearest ready order.
        </p>
        {children}
      </section>
    );
  }

  const items = Array.isArray(offer.items) ? offer.items : [];
  const label = offer.accepted ? "Current order" : "Offered order";

  return (
    <section className={`card ${styles.panel}`} aria-label={label}>
      <div className={styles.orderHead}>
        <h2 className={styles.panelTitle}>
          {label} #{offer.orderId}
        </h2>
        <span className={`chip ${styles.pill}`}>{formatEnum(offer.orderStatus)}</span>
      </div>

      <Steps active={currentStep(offer)} />

      <dl className={styles.fieldList}>
        <dt>Restaurant</dt>
        <dd>{offer.restaurantName || `Restaurant #${offer.restaurantId}`}</dd>
        <dt>Pickup</dt>
        <dd className={styles.coords}>
          {formatCoords(offer.restaurantLatitude, offer.restaurantLongitude)}
        </dd>
        <dt>Drop-off</dt>
        <dd>
          <span className={styles.coords}>
            {formatCoords(offer.dropoffLatitude, offer.dropoffLongitude)}
          </span>{" "}
          <span className={styles.tag}>drop-off</span>
        </dd>
        <dt>Items</dt>
        <dd>
          {items.length === 0 ? (
            "None"
          ) : (
            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item.id}>
                  {item.quantity} x {item.name}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
      {children}
    </section>
  );
}

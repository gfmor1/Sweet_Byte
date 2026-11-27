import styles from "./fare.module.css";

export function money(value, currency = "CAD") {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(Number(value));
}

export default function FareBreakdown({ fare }) {
  if (!fare) {
    return <p>The backend has not supplied a fare yet.</p>;
  }

  const currency = fare.currency || "CAD";
  const discount = Number(fare.discount) || 0;

  // Rows: [label, text, kind]. Promo rows only appear when a code is applied; a $0 surcharge is hidden.
  const surcharge = Number(fare.smallOrderSurcharge) || 0;
  const rows = [
    ["Items subtotal", money(fare.subtotal, currency)],
    ...(fare.promoCode ? [["Promo code", fare.promoCode, "code"]] : []),
    ...(discount > 0 ? [["Discount", `-${money(discount, currency)}`, "discount"]] : []),
    ["Delivery fee", money(fare.deliveryFee, currency)],
    ["Service fee", money(fare.serviceFee, currency)],
    ...(surcharge > 0 ? [["Small-order surcharge", money(surcharge, currency)]] : []),
    ["Total charged", money(fare.total, currency), "total"],
  ];

  return (
    <dl aria-label="Order price breakdown" className={styles.list}>
      {rows.map(([label, text, kind]) => (
        <div
          key={label}
          className={`${styles.row} ${kind === "discount" ? styles.discount : ""} ${
            kind === "total" ? styles.total : ""
          }`}
        >
          <dt>{label}</dt>
          <dd>{kind === "code" ? <span className={styles.code}>{text}</span> : text}</dd>
        </div>
      ))}
    </dl>
  );
}

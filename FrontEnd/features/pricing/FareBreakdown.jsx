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

  const rows = [
    ["Items subtotal", fare.subtotal],
    ["Delivery fee", fare.deliveryFee],
    ["Service fee", fare.serviceFee],
    ["Small-order surcharge", fare.smallOrderSurcharge],
    ["Total charged", fare.total],
  ];

  return (
    <dl aria-label="Order price breakdown">
      {rows.map(([label, amount]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{money(amount, fare.currency || "CAD")}</dd>
        </div>
      ))}
    </dl>
  );
}
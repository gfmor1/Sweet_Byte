import { summarizePayments } from "../../services/paymentApi";
import { money } from "./format";
import styles from "./payment.module.css";

export default function PaymentSummaryCards({ payments, currency = "CAD" }) {
  const s = summarizePayments(payments);
  const tiles = [
    { label: "Collected", value: money(s.paid, currency), sub: `${s.paidCount} paid` },
    { label: "Refunded", value: money(s.refunded, currency), sub: `${s.refundedCount} refunds` },
    { label: "Total payments", value: String(payments.length), sub: "all statuses" },
  ];
  return (
    <div className={styles.cards}>
      {tiles.map((t) => (
        <div key={t.label} className={styles.tile}>
          <div className={styles.tileLabel}>{t.label}</div>
          <div className={styles.tileValue}>{t.value}</div>
          <div className={styles.tileSub}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

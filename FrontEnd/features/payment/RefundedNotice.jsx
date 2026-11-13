"use client";

import { cardLabel, money, time } from "./format";
import styles from "./payment.module.css";

// Tells the customer their money went back (cancel, reject, approved refund request, operator refund).
// payment = one row of GET /api/payments; renders nothing until billing has a REFUND record.
export default function RefundedNotice({ payment }) {
  if (!payment || payment.status !== "REFUNDED") return null;

  const card = payment.last4 ? ` to ${cardLabel(payment)}` : "";
  return (
    <p className={styles.refundedNotice} role="status">
      Refunded {money(payment.refundedAmount ?? payment.amount, payment.currency)}
      {card} on {time(payment.refundedAt)}
      {payment.refundReference && (
        <span className={styles.muted}> · Ref {String(payment.refundReference).slice(0, 8)}</span>
      )}
    </p>
  );
}

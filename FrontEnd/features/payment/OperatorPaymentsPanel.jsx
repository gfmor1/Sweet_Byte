"use client";

import PaymentSummaryCards from "./PaymentSummaryCards";
import PaymentTable from "./PaymentTable";
import styles from "./payment.module.css";

// Operator "Payments" tab. Data comes from useOperatorData; refund goes through runCommand.
export default function OperatorPaymentsPanel({ payments, loaded, disabled, onRefund }) {
  return (
    <div className={styles.root}>
      <PaymentSummaryCards payments={payments} />
      <PaymentTable
        payments={payments}
        loaded={loaded}
        showCustomer
        role="OPERATOR"
        disabled={disabled}
        onRefund={onRefund}
      />
    </div>
  );
}

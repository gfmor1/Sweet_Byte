"use client";

import { useState } from "react";

import { can } from "../../services/permissions";
import PaymentStatusPill from "./PaymentStatusPill";
import { cardLabel, money, time } from "./format";
import styles from "./payment.module.css";

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PAID", label: "Paid" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "FAILED", label: "Failed" },
];

// showCustomer + onRefund are operator-only (R-DASH-04/05 via permissions.can).
export default function PaymentTable({ payments, loaded = true, showCustomer = false, role, onRefund, disabled }) {
  const [filter, setFilter] = useState("ALL");
  const shown = payments.filter((p) => filter === "ALL" || p.status === filter);
  const showActions = Boolean(onRefund);

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <h3>Payments</h3>
        <span className={styles.muted}>{payments.length} total</span>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter payments">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${styles.chip} ${filter === f.id ? styles.chipActive : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loaded && shown.length === 0 ? (
        <p className={styles.empty}>
          {payments.length === 0 ? "No payments yet." : "No payments match this filter."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Order</th>
                {showCustomer && <th>Customer</th>}
                <th>Method</th>
                <th className={styles.num}>Amount</th>
                <th>Status</th>
                <th>Date</th>
                {showActions && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.paymentId}>
                  <td data-label="Payment">#{p.paymentId}</td>
                  <td data-label="Order">{p.orderId ? `#${p.orderId}` : "-"}</td>
                  {showCustomer && <td data-label="Customer">{p.customerName || "-"}</td>}
                  <td data-label="Method">{cardLabel(p)}</td>
                  <td data-label="Amount" className={styles.num}>{money(p.amount, p.currency)}</td>
                  <td data-label="Status">
                    <PaymentStatusPill status={p.status} />
                    {p.failureReason && <div className={styles.muted}>{p.failureReason}</div>}
                  </td>
                  <td data-label="Date">{time(p.refundedAt || p.createdAt)}</td>
                  {showActions && (
                    <td data-label="Action">
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        disabled={disabled || !can(role, "refundPayment", { paymentStatus: p.status })}
                        onClick={() => {
                          if (window.confirm(`Refund payment #${p.paymentId} (${money(p.amount, p.currency)})?`)) {
                            onRefund(p);
                          }
                        }}
                      >
                        Refund
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";

import { formatEnum } from "../../services/enumApi";
import styles from "./operator.module.css";

function money(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function time(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "CHARGE", label: "Charges" },
  { id: "REFUND", label: "Refunds" },
];

// Charges are never edited; refunds appear as separate, visibly distinct entries.
export default function LedgerTable({ ledger, loaded }) {
  const [filter, setFilter] = useState("ALL");

  const shown = ledger.filter((e) => {
    if (filter === "ALL") return true;
    return (e.type === "REFUND") === (filter === "REFUND");
  });

  const currency = ledger.find((e) => e.currency)?.currency;
  let charges = 0;
  let refunds = 0;
  for (const e of shown) {
    const amt = Math.abs(Number(e.amount)) || 0;
    if (e.type === "REFUND") refunds += amt;
    else charges += amt;
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Ledger</h2>
        <span className={`${styles.pill} ${styles.pillCount}`}>{ledger.length}</span>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter ledger entries">
        {FILTERS.map((f) => (
          <button
            key={f.id}
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
          {ledger.length === 0 ? "No ledger entries yet." : "No entries match this filter."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Entry</th>
                <th>Order</th>
                <th>Type</th>
                <th>Promo code</th>
                <th className={styles.num}>Discount</th>
                <th className={styles.num}>Amount</th>
                <th>Final status</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const refund = e.type === "REFUND";
                return (
                  <tr key={e.entryId} className={refund ? styles.refund : styles.charge}>
                    <td data-label="Entry">{e.entryId}</td>
                    <td data-label="Order">#{e.orderId}</td>
                    <td data-label="Type">
                      <span className={`${styles.typeTag} ${refund ? styles.typeRefund : styles.typeCharge}`}>
                        {refund ? "REFUND" : "CHARGE"}
                      </span>
                    </td>
                    <td data-label="Promo code">{e.promoCode || "-"}</td>
                    <td data-label="Discount" className={styles.num}>
                      {Number(e.discount) > 0 ? `-${money(e.discount, e.currency)}` : "-"}
                    </td>
                    <td
                      data-label="Amount"
                      className={`${styles.num} ${refund ? styles.refundAmount : styles.chargeAmount}`}
                    >
                      {refund ? "-" : ""}
                      {money(Math.abs(Number(e.amount)), e.currency)}
                    </td>
                    <td data-label="Final status">{formatEnum(e.finalState)}</td>
                    <td data-label="Recorded">{time(e.recordedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
            {shown.length > 0 && (
              <tfoot>
                <tr>
                  <td data-label="Totals" colSpan={5}>
                    Charges {money(charges, currency)} / Refunds -{money(refunds, currency)}
                  </td>
                  <td data-label="Net" className={styles.num}>
                    {money(charges - refunds, currency)}
                  </td>
                  <td colSpan={2} className={styles.muted} data-label="Entries">
                    {shown.length} shown
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

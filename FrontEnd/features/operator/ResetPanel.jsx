"use client";

import { useState } from "react";

import { can, explain } from "../../services/permissions";
import styles from "./operator.module.css";

export default function ResetPanel({ disabled, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const reason = explain("OPERATOR", "reset");
  const allowed = can("OPERATOR", "reset");

  return (
    <section className={`${styles.card}`}>
      <h2 className={styles.sectionTitle}>Reset simulator</h2>
      <p className={styles.muted}>
        Restore the initial restaurants, menus, couriers, orders and billing records from the
        configured seed.
      </p>
      {confirming ? (
        <div className={styles.warn} role="alertdialog" aria-label="Confirm simulator reset">
          <p>Current simulator changes will be discarded. Restore the initial state?</p>
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnSolidDanger}`}
              disabled={disabled || !allowed}
              onClick={() => {
                setConfirming(false);
                onReset();
              }}
            >
              Confirm reset
            </button>
            <button className={`${styles.btn} ${styles.btnGhost}`} disabled={disabled} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={disabled || !allowed}
            title={reason || undefined}
            onClick={() => setConfirming(true)}
          >
            Reset simulator
          </button>
        </div>
      )}
    </section>
  );
}

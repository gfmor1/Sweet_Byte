"use client";

import { useState } from "react";

import { can, explain } from "../../services/permissions";
import styles from "./operator.module.css";

// Operator-only Reset (R-DASH): restores the initial state from the seed configuration file.
// Two-step click so a demo is never wiped by accident.
export default function ResetButton({ disabled, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const reason = explain("OPERATOR", "reset");
  const allowed = can("OPERATOR", "reset");

  if (!confirming) {
    return (
      <button
        className={`${styles.btn} ${styles.btnDanger}`}
        disabled={disabled || !allowed}
        title={reason || "Restore restaurants, menus, couriers and accounts from the seed file; delete all orders and billing"}
        onClick={() => setConfirming(true)}
      >
        Reset
      </button>
    );
  }

  return (
    <span role="alertdialog" aria-label="Confirm system reset" className={styles.actions}>
      <span className={styles.muted}>Discard all orders and restore the initial state?</span>
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
    </span>
  );
}

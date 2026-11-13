"use client";

import { useState } from "react";

import { cardLabel } from "./format";
import styles from "./payment.module.css";

const EMPTY = { number: "", holder: "", expMonth: "", expYear: "", cvv: "" };

const FIELD_LABELS = {
  number: "card number",
  holder: "name on card",
  expMonth: "expiry month",
  expYear: "expiry year",
  cvv: "CVV",
};

// Mock card entry. Number/CVV live only in this component's state and are cleared after saving.
// Any card number of 13 to 19 digits is accepted; every payment is approved (demo only).
export default function PaymentCardForm({ card, onSave, onRemove, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(!card);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Every field is required; spaces alone do not count.
  const missing = Object.entries(FIELD_LABELS)
    .filter(([key]) => !String(form[key]).trim())
    .map(([, label]) => label);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    try {
      await onSave(form);
      setForm(EMPTY);
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Could not save the card.");
    }
  }

  if (card && !editing) {
    return (
      <div className={styles.cardBox}>
        <div className={styles.savedCard}>
          <div>
            <div className={styles.cardFace}>{cardLabel(card)}</div>
            <div className={styles.muted}>
              {card.holder} · expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} disabled={busy} onClick={() => setEditing(true)}>
              Replace
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className={`${styles.cardBox} ${styles.form}`} onSubmit={submit} autoComplete="off">
      <label className={`${styles.field} ${styles.full}`}>
        Card number
        <input inputMode="numeric" placeholder="1234 5678 9012 3456" value={form.number} onChange={set("number")} required />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        Name on card
        <input value={form.holder} onChange={set("holder")} required />
      </label>
      <label className={styles.field}>
        Expiry month
        <input inputMode="numeric" placeholder="MM" maxLength={2} value={form.expMonth} onChange={set("expMonth")} required />
      </label>
      <label className={styles.field}>
        Expiry year
        <input inputMode="numeric" placeholder="YYYY" maxLength={4} value={form.expYear} onChange={set("expYear")} required />
      </label>
      <label className={styles.field}>
        CVV
        <input inputMode="numeric" maxLength={4} value={form.cvv} onChange={set("cvv")} required />
      </label>
      <p className={`${styles.muted} ${styles.full}`}>
        Demo only: no real payment. Any card number of 13 to 19 digits works.
      </p>
      {error && <p role="alert" className={`${styles.error} ${styles.full}`}>{error}</p>}
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={busy || missing.length > 0}
          title={missing.length ? `Fill in: ${missing.join(", ")}` : undefined}
        >
          Save card
        </button>
        {card && (
          <button type="button" className={styles.btn} disabled={busy} onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

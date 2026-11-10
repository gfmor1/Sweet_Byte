"use client";

import { useCallback, useEffect, useState } from "react";

import { getMyPayments, getSavedCard, removeCard, saveCard } from "../../services/paymentApi";
import PaymentCardForm from "./PaymentCardForm";
import PaymentSummaryCards from "./PaymentSummaryCards";
import PaymentTable from "./PaymentTable";
import styles from "./payment.module.css";

// Customer "Payments" tab: saved card + own payment history. `refreshKey` reloads after checkout.
export default function CustomerPaymentsPanel({ user, onLog, refreshKey = 0, onCardChange }) {
  const [card, setCard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [c, p] = await Promise.allSettled([getSavedCard(user), getMyPayments(user)]);
    if (c.status === "fulfilled") setCard(c.value);
    if (p.status === "fulfilled" && Array.isArray(p.value)) setPayments(p.value);
    const failed = [c, p].find((r) => r.status === "rejected");
    setError(failed ? failed.reason?.message || "Could not load payments." : "");
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleSave(form) {
    setBusy(true);
    onLog?.({ command: "Save payment card" });
    try {
      const saved = await saveCard(user, form);
      setCard(saved);
      onCardChange?.(saved);
      onLog?.({ command: "Save payment card", result: "Success" });
    } catch (err) {
      onLog?.({ command: "Save payment card", error: err.message });
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    onLog?.({ command: "Remove payment card" });
    try {
      await removeCard(user);
      setCard(null);
      onCardChange?.(null);
      onLog?.({ command: "Remove payment card", result: "Success" });
    } catch (err) {
      setError(err.message);
      onLog?.({ command: "Remove payment card", error: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <h3>Payment method</h3>
      <PaymentCardForm card={card} onSave={handleSave} onRemove={handleRemove} busy={busy} />
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <PaymentSummaryCards payments={payments} />
      <PaymentTable payments={payments} loaded={loaded} role="CUSTOMER" />
    </div>
  );
}

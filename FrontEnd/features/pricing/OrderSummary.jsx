"use client";

import { useEffect, useRef, useState } from "react";

import {
  getOrderSummary,
  pricingEnabled,
} from "../../services/pricingApi";

import FareBreakdown from "./FareBreakdown";

export default function OrderSummary({ orderId, onLog }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  useEffect(() => {
    if (!pricingEnabled) return;

    let active = true;

    setSummary(null);
    setError("");
    setLoading(true);

    logCallback.current?.({
      command: "Load order summary",
      orderId,
    });

    getOrderSummary(orderId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message);

        logCallback.current?.({
          command: "Load order summary",
          orderId,
          error: err.message,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  if (!pricingEnabled) {
    return (
      <p>
        Order pricing will appear once the pricing service is connected.
      </p>
    );
  }

  if (loading) {
    return <p role="status">Loading order summary...</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>

        <button onClick={() => setAttempt((value) => value + 1)}>
          Retry summary
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <section aria-label={`Summary for order ${orderId}`}>
      <h4>Delivered order summary</h4>

      <p>
        Delivered:{" "}
        {summary.deliveredAt
          ? new Date(summary.deliveredAt).toLocaleString()
          : "Unavailable"}
      </p>

      <FareBreakdown fare={summary.fare} />
    </section>
  );
}
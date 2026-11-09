"use client";

import { useEffect, useRef, useState } from "react";

import { getPricingConfig } from "../../services/pricingApi";
import { calculateFare } from "../../services/config";

import FareBreakdown from "./FareBreakdown";

// Fare preview for a cart subtotal. Fee values come from the pricing config
// (GET /api/pricing/config), never from values written in the code.
export default function FarePreview({ subtotal, onLog }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");

  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  useEffect(() => {
    let active = true;

    logCallback.current?.({ command: "Load pricing config" });

    getPricingConfig()
      .then((data) => {
        if (!active) return;
        setConfig(data);
        logCallback.current?.({
          command: "Load pricing config",
          result: "Success",
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        logCallback.current?.({
          command: "Load pricing config",
          error: err.message,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p role="alert">Fare preview unavailable: {error}</p>;
  }

  if (!config) {
    return <p role="status">Loading pricing...</p>;
  }

  const fare = calculateFare(subtotal, config);

  return (
    <section aria-label="Fare preview" style={{ margin: "0.75rem 0" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>
        Fare preview
      </h3>

      {subtotal > 0 ? (
        <FareBreakdown fare={fare} />
      ) : (
        <p>Add items to see the fare breakdown.</p>
      )}
    </section>
  );
}

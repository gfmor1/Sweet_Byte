"use client";

import { useEffect, useRef, useState } from "react";

import { getPricingConfig, previewFare } from "../../services/pricingApi";
import { calculateFare } from "../../services/config";

import FareBreakdown from "./FareBreakdown";

// Fare preview for a cart subtotal. Fee values come from the pricing config
// (GET /api/pricing/config); previewFare's defaults are only a fallback.
export default function FarePreview({ subtotal, onLog }) {
  const [config, setConfig] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

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
        setUsingFallback(true);
        logCallback.current?.({
          command: "Load pricing config",
          error: err.message,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  if (!config && !usingFallback) {
    return <p role="status">Loading pricing...</p>;
  }

  const fare = config
    ? calculateFare(subtotal, config)
    : previewFare(subtotal);

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

      {usingFallback && subtotal > 0 && (
        <p style={{ fontSize: "0.85rem" }}>
          Estimate based on default pricing; the final fare is confirmed
          when the order is placed.
        </p>
      )}
    </section>
  );
}

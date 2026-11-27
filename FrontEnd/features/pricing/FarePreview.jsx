"use client";

import { useEffect, useRef, useState } from "react";

import { getPricingConfig } from "../../services/pricingApi";
import { calculateFare } from "../../services/config";

import FareBreakdown from "./FareBreakdown";
import styles from "./fare.module.css";

// Fare preview for a cart subtotal. Fee values come from the pricing config
// (GET /api/pricing/config), never from values written in the code.
export default function FarePreview({ subtotal, promo = null, onLog }) {
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

  const fare = {
    ...calculateFare(subtotal, config, promo?.discount || 0),
    ...(promo ? { promoCode: promo.code } : {}),
  };

  return (
    <section aria-label="Fare preview" className={`ui-card ${styles.card}`}>
      <h3 className={`ui-label ${styles.cardTitle}`}>Order summary</h3>

      {subtotal > 0 ? (
        <FareBreakdown fare={fare} />
      ) : (
        <p className={styles.empty}>Add items to see the price breakdown.</p>
      )}
    </section>
  );
}

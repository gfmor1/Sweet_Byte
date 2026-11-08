"use client";

import { useEffect, useRef, useState } from "react";

import { getFare } from "../../services/pricingApi";

import FareBreakdown from "./FareBreakdown";

// Fare of an already placed order (GET /api/orders/{id}/fare).
export default function OrderFare({ orderId, onLog }) {
  const [fare, setFare] = useState(null);
  const [error, setError] = useState("");

  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  useEffect(() => {
    let active = true;

    setFare(null);
    setError("");

    logCallback.current?.({ command: "Load order fare", orderId });

    getFare(orderId)
      .then((data) => {
        if (!active) return;
        setFare(data);
        logCallback.current?.({
          command: "Load order fare",
          orderId,
          result: "Success",
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        logCallback.current?.({
          command: "Load order fare",
          orderId,
          error: err.message,
        });
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  if (error) {
    return <p role="status">Fare unavailable: {error}</p>;
  }

  if (!fare) return <p role="status">Loading fare...</p>;

  return <FareBreakdown fare={fare} />;
}

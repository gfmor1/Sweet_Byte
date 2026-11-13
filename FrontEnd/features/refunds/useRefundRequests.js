"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getRefundRequests } from "../../services/refundApi";

const POLL_MS = 5000;

// Refund requests visible to the logged-in user, refreshed every POLL_MS.
export default function useRefundRequests(onLog) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  const lastError = useRef("");
  const logRef = useRef(onLog);

  useEffect(() => {
    logRef.current = onLog;
  }, [onLog]);

  const reload = useCallback(async () => {
    try {
      setRequests(await getRefundRequests());
      setError("");
      lastError.current = "";
    } catch (err) {
      const text = err.message || "Could not load refund requests.";
      setError(text);
      // Log a repeating failure once, not every 5 seconds
      if (text !== lastError.current) {
        lastError.current = text;
        logRef.current?.({ command: "Load refund requests", error: text });
      }
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return { requests, error, reload };
}

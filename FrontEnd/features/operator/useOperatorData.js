"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getOperatorDashboard, getLedger } from "../../services/operatorApi";
import { getCouriers, getDispatchQueue } from "../../services/dispatchApi";

export const POLL_MS = 5000;

const EMPTY = {
  restaurants: [],
  orders: [],
  couriers: [],
  queue: [],
  ledger: [],
};

// Loads everything the operator dashboard shows. No overlapping requests,
// stale responses are dropped, and polls every POLL_MS while active.
export default function useOperatorData({ active, onLog, paused }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const mounted = useRef(false);
  const version = useRef(0);
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const lastLoggedError = useRef("");
  const logRef = useRef(onLog);
  const pausedRef = useRef(paused);

  useEffect(() => {
    logRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const refresh = useCallback(async () => {
    if (!active) return;
    if (inFlight.current) {
      // Run once more when the current request ends (manual refresh / after a command).
      rerun.current = true;
      return;
    }

    inFlight.current = true;
    const mine = ++version.current;
    if (mounted.current) setLoading(true);

    const results = await Promise.allSettled([
      getOperatorDashboard(),
      getCouriers(),
      getDispatchQueue(),
      getLedger(),
    ]);

    inFlight.current = false;

    if (mounted.current && mine === version.current) {
      const [dash, couriers, queue, ledger] = results;
      const errors = [];
      const next = {};

      if (dash.status === "fulfilled") {
        const d = dash.value;
        if (Array.isArray(d?.restaurants) && Array.isArray(d?.orders)) {
          next.restaurants = d.restaurants;
          next.orders = d.orders;
        } else {
          errors.push("Operator response must contain restaurants and orders arrays.");
        }
      } else {
        errors.push(dash.reason?.message || "Could not load operator dashboard.");
      }

      for (const [key, res, label] of [
        ["couriers", couriers, "couriers"],
        ["queue", queue, "dispatch queue"],
        ["ledger", ledger, "ledger"],
      ]) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          next[key] = res.value;
        } else {
          errors.push(
            res.status === "rejected"
              ? res.reason?.message || `Could not load ${label}.`
              : `Unexpected ${label} response.`
          );
        }
      }

      setData((prev) => ({ ...prev, ...next }));
      setLoaded(true);

      if (errors.length) {
        const text = errors.join(" ");
        setError(text);
        if (text !== lastLoggedError.current) {
          lastLoggedError.current = text;
          logRef.current?.({ command: "Load operator dashboard", error: text });
        }
      } else {
        setError("");
        lastLoggedError.current = "";
      }
      setLoading(false);
    }

    if (rerun.current) {
      rerun.current = false;
      if (mounted.current) refresh();
    }
  }, [active]);

  useEffect(() => {
    mounted.current = true;
    setData(EMPTY);
    setLoaded(false);
    setError("");
    lastLoggedError.current = "";

    if (!active) return undefined;

    refresh();
    const timer = setInterval(() => {
      if (!pausedRef.current) refresh();
    }, POLL_MS);

    return () => {
      mounted.current = false;
      version.current += 1;
      clearInterval(timer);
    };
  }, [active, refresh]);

  return { ...data, loading, loaded, error, refresh };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  acceptOffer,
  confirmDelivery,
  confirmPickup,
  declineOffer,
  getMe,
  getOffer,
  goOffDuty,
  goOnDuty,
} from "../../services/courierApi";

const POLL_MS = 5000;

const COMMANDS = {
  "Go on duty": goOnDuty,
  "Go off duty": goOffDuty,
  "Accept offer": acceptOffer,
  "Decline offer": declineOffer,
  "Confirm pickup": confirmPickup,
  "Confirm delivery": confirmDelivery,
};

const SUCCESS_TEXT = {
  "Go on duty": "You are on duty.",
  "Go off duty": "You are off duty.",
  "Accept offer": "Offer accepted.",
  "Decline offer": "Offer declined.",
  "Confirm pickup": "Pickup confirmed.",
  "Confirm delivery": "Delivery confirmed.",
};

export default function useCourier(onLog) {
  const [courier, setCourier] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mounted = useRef(true);
  const version = useRef(0);
  const inFlight = useRef(false);
  const commandRunning = useRef(false);
  const logRef = useRef(onLog);
  const offerRef = useRef(null);

  useEffect(() => {
    logRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    offerRef.current = offer;
  }, [offer]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const myVersion = ++version.current;
    try {
      const [me, currentOffer] = await Promise.all([getMe(), getOffer()]);
      if (!mounted.current || myVersion !== version.current) return;
      setCourier(me);
      setOffer(currentOffer || null);
      setError((previous) => (previous.startsWith("Could not refresh") ? "" : previous));
    } catch (err) {
      if (!mounted.current || myVersion !== version.current) return;
      setError(`Could not refresh: ${err.message || "request failed"}`);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoaded(true);
    }
  }, []);

  // Poll every 5s, one request at a time; cleaned up on unmount.
  useEffect(() => {
    mounted.current = true;
    let timer;
    let cancelled = false;

    async function tick() {
      await refresh();
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }
    tick();

    return () => {
      cancelled = true;
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  const runCommand = useCallback(
    async (command) => {
      const action = COMMANDS[command];
      if (!action || commandRunning.current) return;
      commandRunning.current = true;
      setBusy(true);
      setMessage("");
      setError("");
      logRef.current?.({ command });
      try {
        // Order commands need the current order's id; duty commands ignore it.
        const updated = await action(offerRef.current?.orderId);
        // Invalidate any in-flight poll so its older data is ignored.
        version.current++;
        inFlight.current = false;
        logRef.current?.({ command, result: "Success" });
        if (mounted.current) {
          if (updated && typeof updated === "object") setCourier(updated);
          setMessage(SUCCESS_TEXT[command]);
        }
      } catch (err) {
        logRef.current?.({ command, error: err.message || "Request failed" });
        if (mounted.current) setError(err.message || "Request failed");
      } finally {
        commandRunning.current = false;
        if (mounted.current) setBusy(false);
      }
      if (mounted.current) await refresh();
    },
    [refresh]
  );

  return { courier, offer, loaded, busy, message, error, runCommand };
}

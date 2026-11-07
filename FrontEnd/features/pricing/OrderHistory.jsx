"use client";

import { useEffect, useRef, useState } from "react";

import {
  getHistory,
  pricingEnabled,
} from "../../services/pricingApi";

import { money } from "./FareBreakdown";

export default function OrderHistory({
  refreshKey = 0,
  showAmounts = true,
  onLog,
}) {
  const [entries, setEntries] = useState([]);
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

    setEntries([]);
    setError("");
    setLoading(true);

    logCallback.current?.({
      command: "Load order history",
    });

    getHistory()
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("History must be an array of entries.");
        }

        if (active) setEntries(data);
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message);

        logCallback.current?.({
          command: "Load order history",
          error: err.message,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey, attempt]);

  return (
    <section>
      <h2>Order History</h2>

      {!pricingEnabled ? (
        <p>
          History will appear once the pricing service is connected.
        </p>
      ) : (
        <>
          <button
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Refresh history
          </button>

          {loading ? (
            <p role="status">Loading history...</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : entries.length === 0 ? (
            <p>No history entries yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Order</th>
                    <th>Type</th>
                    <th>Final state</th>
                    <th>Recorded</th>
                    {showAmounts && <th>Amount</th>}
                  </tr>
                </thead>

                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.entryId}>
                      <td>{entry.entryId}</td>
                      <td>#{entry.orderId}</td>
                      <td>{entry.type}</td>
                      <td>{entry.finalState}</td>

                      <td>
                        {entry.recordedAt
                          ? new Date(entry.recordedAt).toLocaleString()
                          : "Unavailable"}
                      </td>

                      {showAmounts && (
                        <td>
                          {money(
                            entry.amount,
                            entry.currency || "CAD"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
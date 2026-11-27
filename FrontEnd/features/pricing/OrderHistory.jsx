"use client";

import { useEffect, useRef, useState } from "react";

import { getHistory } from "../../services/pricingApi";

import { money } from "./FareBreakdown";

export default function OrderHistory({
  refreshKey = 0,
  showAmounts = true,
  showPromo = false, // customer view only: promo code + discount columns
  ownerOrderIds = null, // array of order ids the viewer may see; null = no extra filter
  onLog,
}) {
  const ownOrderIds = useRef(null);
  ownOrderIds.current = ownerOrderIds
    ? new Set(ownerOrderIds.map(String))
    : null;

  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const logCallback = useRef(onLog);

  useEffect(() => {
    logCallback.current = onLog;
  }, [onLog]);

  useEffect(() => {
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

        if (!active) return;

        // Role scoping: when the caller knows the user's own order ids,
        // never show entries for any other order.
        const scoped = ownOrderIds.current
          ? data.filter((entry) =>
              ownOrderIds.current.has(String(entry.orderId))
            )
          : data;

        setEntries(scoped);

        logCallback.current?.({
          command: "Load order history",
          result: "Success",
        });
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
      <h2 style={{ fontSize: "1.15rem" }}>Order History</h2>

      <>
          <button
            className="btn-secondary"
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
            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Order</th>
                    <th>Type</th>
                    <th>Final state</th>
                    <th>Recorded</th>
                    {showPromo && <th>Promo code</th>}
                    {showPromo && <th>Discount</th>}
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

                      {showPromo && <td>{entry.promoCode || "-"}</td>}
                      {showPromo && (
                        <td>
                          {Number(entry.discount) > 0
                            ? `-${money(entry.discount, entry.currency || "CAD")}`
                            : "-"}
                        </td>
                      )}

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
    </section>
  );
}
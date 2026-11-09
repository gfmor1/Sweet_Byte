"use client";

import { useEffect, useRef, useState } from "react";

import { REFUND_REASONS, useMocks } from "../../services/config";
import { can } from "../../services/permissions";
import { getRefundableOrders, submitRefundRequest } from "../../services/refundApi";
import RefundRequestsList from "./RefundRequestsList";
import useRefundRequests from "./useRefundRequests";

const ROLE = "CUSTOMER";

// Customer side of UC-PRC-05: eligible orders with a request form, and the state of past requests.
export default function RefundPanel({ onLog }) {
  const { requests, error: requestsError, reload } = useRefundRequests(onLog);
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [openOrderId, setOpenOrderId] = useState(null);
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const logRef = useRef(onLog);
  logRef.current = onLog;

  const requestsKey = requests.map((request) => `${request.id}:${request.status}`).join(",");

  useEffect(() => {
    let active = true;
    getRefundableOrders()
      .then((list) => {
        if (!active) return;
        setOrders(list);
        setOrdersError("");
      })
      .catch((err) => {
        if (!active) return;
        setOrdersError(err.message);
        logRef.current?.({ command: "Load refundable orders", error: err.message });
      });
    return () => {
      active = false;
    };
  }, [requestsKey]);

  function allowedReasons(order) {
    const hasPendingRequest = requests.some(
      (request) => String(request.orderId) === String(order.id) && request.status === "PENDING"
    );
    return Object.keys(REFUND_REASONS).filter((refundReason) =>
      can(ROLE, "requestRefund", {
        orderStatus: order.status,
        deliveredAt: order.deliveredAt,
        refundReason,
        hasPendingRequest,
      })
    );
  }

  function openForm(order) {
    setOpenOrderId(order.id);
    setReason(allowedReasons(order)[0]);
    setProof("");
    setFormError("");
    setMessage("");
  }

  async function handleSubmit(event, order) {
    event.preventDefault();
    const command = `Request refund for order #${order.id}`;
    setSubmitting(true);
    setFormError("");
    logRef.current?.({ command });
    try {
      await submitRefundRequest({ orderId: order.id, reason, proof: proof.trim() });
      logRef.current?.({ command, result: "Success" });
      setOpenOrderId(null);
      setMessage(`Refund request sent for order #${order.id}.`);
      await reload();
    } catch (err) {
      setFormError(err.message);
      logRef.current?.({ command, error: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const eligible = orders.filter((order) => allowedReasons(order).length > 0);

  return (
    <section>
      <h2 style={{ fontSize: "1.15rem" }}>Request a refund</h2>
      {useMocks && <p>Mock mode: these are sample orders.</p>}
      {message && <p role="status">{message}</p>}
      {ordersError && <p role="alert">{ordersError}</p>}

      {eligible.length === 0 && !ordersError ? (
        <p>No orders are eligible for a refund right now.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {eligible.map((order) => (
            <li key={order.id} className="card" style={{ marginBottom: "0.5rem" }}>
              <strong>Order #{order.id}</strong> - {order.restaurantName}
              {openOrderId === order.id ? (
                <form onSubmit={(event) => handleSubmit(event, order)}>
                  <label style={{ display: "block", marginTop: "0.5rem" }}>
                    Reason{" "}
                    <select value={reason} onChange={(event) => setReason(event.target.value)}>
                      {allowedReasons(order).map((value) => (
                        <option key={value} value={value}>
                          {REFUND_REASONS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "block", marginTop: "0.5rem" }}>
                    Proof
                    <textarea
                      value={proof}
                      onChange={(event) => setProof(event.target.value)}
                      placeholder="Describe what happened"
                      required
                      style={{ display: "block", width: "100%" }}
                    />
                  </label>
                  {formError && <p role="alert">{formError}</p>}
                  <button type="submit" disabled={submitting || !proof.trim()}>
                    {submitting ? "Sending..." : "Send request"}
                  </button>{" "}
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={submitting}
                    onClick={() => setOpenOrderId(null)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <button type="button" className="btn-secondary" onClick={() => openForm(order)}>
                    Request Refund
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.15rem" }}>My refund requests</h2>
      {requestsError && <p role="alert">{requestsError}</p>}
      <RefundRequestsList requests={requests} emptyText="No refund requests yet." />
    </section>
  );
}

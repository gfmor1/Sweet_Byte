"use client";

import RefundRequestsList from "./RefundRequestsList";
import useRefundRequests from "./useRefundRequests";

// Restaurant notification of accepted refunds (UC-PRC-06).
export default function RefundNotices({ onLog }) {
  const { requests, error } = useRefundRequests(onLog);

  return (
    <section>
      <h2 style={{ fontSize: "1.15rem" }}>Refunded orders</h2>
      {error && <p role="alert">{error}</p>}
      <RefundRequestsList
        requests={requests.filter((request) => request.status === "ACCEPTED")}
        emptyText="No orders have been refunded."
      />
    </section>
  );
}

"use client";

import { REFUND_REASONS } from "../../services/config";
import { formatEnum } from "../../services/enumApi";

export default function RefundRequestsList({ requests, emptyText }) {
  if (requests.length === 0) return <p>{emptyText}</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {requests.map((request) => (
        <li key={request.id} className="card" style={{ marginBottom: "0.5rem" }}>
          <strong>Order #{request.orderId}</strong>
          {request.restaurantName ? ` - ${request.restaurantName} ` : " "}
          <span className="chip">{formatEnum(request.status)}</span>
          <p style={{ margin: "0.25rem 0 0" }}>
            {REFUND_REASONS[request.reason] || request.reason}
          </p>
        </li>
      ))}
    </ul>
  );
}

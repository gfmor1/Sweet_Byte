"use client";

import { REFUND_REASONS } from "../../services/config";
import { formatEnum } from "../../services/enumApi";
import { money } from "../pricing/FareBreakdown";

// refunds: optional { [orderId]: REFUND ledger entry }, shown on accepted requests.
export default function RefundRequestsList({ requests, emptyText, refunds = {} }) {
  if (requests.length === 0) return <p>{emptyText}</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {requests.map((request) => {
        const refund = refunds[String(request.orderId)];
        return (
          <li key={request.id} className="card" style={{ marginBottom: "0.5rem" }}>
            <strong>Order #{request.orderId}</strong>
            {request.restaurantName ? ` - ${request.restaurantName} ` : " "}
            <span className="chip">{formatEnum(request.status)}</span>
            <p style={{ margin: "0.25rem 0 0" }}>
              {REFUND_REASONS[request.reason] || request.reason}
            </p>
            {request.operatorNote && (
              <p style={{ margin: "0.25rem 0 0" }}>Operator: {request.operatorNote}</p>
            )}
            {request.status === "ACCEPTED" && refund && (
              <p style={{ margin: "0.25rem 0 0" }}>
                Refunded {money(refund.amount)}
                {refund.recordedAt ? ` on ${new Date(refund.recordedAt).toLocaleString()}` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

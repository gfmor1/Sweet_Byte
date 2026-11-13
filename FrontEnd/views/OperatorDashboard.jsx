"use client";

import { useEffect, useRef, useState } from "react";

import {
  pauseRestaurant,
  reopenRestaurant,
  reassignOrder,
  refundOrder,
  resetSystem,
} from "../services/operatorApi";
import { acceptRefundRequest, declineRefundRequest } from "../services/refundApi";

import useOperatorData from "../features/operator/useOperatorData";
import Tabs from "../components/Tabs";
import OverviewPanel from "../features/operator/OverviewPanel";
import CouriersTable from "../features/operator/CouriersTable";
import DispatchQueue from "../features/operator/DispatchQueue";
import OrdersPanel from "../features/operator/OrdersPanel";
import OperatorPaymentsPanel from "../features/payment/OperatorPaymentsPanel";
import { paymentsEnabled, refundPayment } from "../services/paymentApi";
import LedgerTable from "../features/operator/LedgerTable";
import RefundReviewPanel from "../features/operator/RefundReviewPanel";
import ResetButton from "../features/operator/ResetButton";
import styles from "../features/operator/operator.module.css";

export default function OperatorDashboard({ user, onLog }) {
  const isOperator = user?.role === "OPERATOR";
  const active = isOperator;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mounted = useRef(true);
  const actionRunning = useRef(false);
  const logRef = useRef(onLog);

  useEffect(() => {
    logRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const data = useOperatorData({ active, onLog, paused: busy });
  const { refresh } = data;

  async function runCommand(command, action, successMessage) {
    if (actionRunning.current || !active) return;
    actionRunning.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    logRef.current?.({ command });

    try {
      await action();
      if (mounted.current) setMessage(successMessage);
      logRef.current?.({ command, result: "Success" });
      await refresh();
    } catch (err) {
      const text = err?.message || "Command failed.";
      if (mounted.current) setError(text);
      logRef.current?.({ command, error: text });
    } finally {
      actionRunning.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (!isOperator) {
    return <p role="alert">An operator account is required to access this dashboard.</p>;
  }

  const disabled = busy;
  const stalledCount = data.orders.filter((o) => o.canReassign === true).length;
  const pendingRefunds = data.refunds.filter((r) => r.status === "PENDING").length;

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <OverviewPanel
          restaurants={data.restaurants}
          orders={data.orders}
          couriers={data.couriers}
          queue={data.queue}
          loaded={data.loaded}
          disabled={disabled}
          stalledCount={stalledCount}
          onPause={(r) =>
            runCommand(`Pause restaurant #${r.id}`, () => pauseRestaurant(r.id), `${r.name} paused.`)
          }
          onReopen={(r) =>
            runCommand(`Reopen restaurant #${r.id}`, () => reopenRestaurant(r.id), `${r.name} reopened.`)
          }
        />
      ),
    },
    {
      id: "orders",
      label: "Orders",
      badge: stalledCount > 0 ? stalledCount : undefined,
      content: (
        <OrdersPanel
          orders={data.orders}
          loaded={data.loaded}
          disabled={disabled}
          onLog={onLog}
          onReassign={(o) =>
            runCommand(
              `Reassign order #${o.id}`,
              () => reassignOrder(o.id),
              `Reassignment requested for order #${o.id}.`
            )
          }
          onRefund={(o) =>
            runCommand(`Refund order #${o.id}`, () => refundOrder(o.id), `Order #${o.id} refunded.`)
          }
        />
      ),
    },
    {
      id: "couriers",
      label: "Couriers",
      badge: data.queue.length > 0 ? data.queue.length : undefined,
      content: (
        <div className={styles.lanes}>
          <CouriersTable couriers={data.couriers} loaded={data.loaded} />
          <DispatchQueue queue={data.queue} loaded={data.loaded} />
        </div>
      ),
    },
    {
      id: "refunds",
      label: "Refunds",
      badge: pendingRefunds > 0 ? pendingRefunds : undefined,
      content: (
        <RefundReviewPanel
          requests={data.refunds}
          loaded={data.loaded}
          disabled={disabled}
          onAccept={(r) =>
            runCommand(
              `Accept refund request #${r.id}`,
              () => acceptRefundRequest(r.id),
              `Order #${r.orderId} refunded.`
            )
          }
          onDecline={(r, note) =>
            runCommand(
              `Decline refund request #${r.id}`,
              () => declineRefundRequest(r.id, note),
              `Refund request for order #${r.orderId} declined.`
            )
          }
        />
      ),
    },
    {
      id: "ledger",
      label: "Ledger",
      content: <LedgerTable ledger={data.ledger} loaded={data.loaded} />,
    },
    ...(paymentsEnabled
      ? [
          {
            id: "payments",
            label: "Payments",
            content: (
              <OperatorPaymentsPanel
                payments={data.payments}
                loaded={data.loaded}
                disabled={disabled}
                onRefund={(p) =>
                  runCommand(
                    `Refund payment #${p.paymentId}`,
                    () => refundPayment(p),
                    `Payment #${p.paymentId} refunded.`
                  )
                }
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={`dashboard ${styles.root}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Operator Dashboard</h2>
        <div className={styles.toolbar}>
          <span className={styles.muted}>
            {user.name || user.email || "Operator"} &middot; refreshes every 5s
          </span>
          <ResetButton
            disabled={busy}
            onReset={() =>
              runCommand("Reset system", resetSystem, "System restored to its initial state.")
            }
          />
        </div>
      </div>

      {busy && (
        <p role="status" className={styles.muted}>
          Processing command...
        </p>
      )}
      {(error || data.error) && (
        <p role="alert" className={`${styles.msg} ${styles.msgError}`}>
          {error || data.error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.msg}>
          {message}
        </p>
      )}

      <Tabs tabs={tabs} defaultTab="overview" ariaLabel="Operator sections" />
    </div>
  );
}

"use client";

import { useState } from "react";

import { can, explain } from "../../services/permissions";
import styles from "./courier.module.css";

const ROLE = "COURIER";

const HINTS = {
  OFFLINE: "You are off duty and will not receive orders.",
  IDLE: "You are on duty and waiting for an order.",
  ASSIGNED: "An order has been assigned to you.",
  CARRYING: "You are carrying an order to the customer.",
};

const CAN_DO = [
  "Go on or off duty.",
  "Accept the order offered to you.",
  "Confirm pickup at the restaurant.",
  "Confirm delivery at the drop-off.",
];

export default function CourierStatus({ courier, offer, busy, onCommand }) {
  const [confirmOff, setConfirmOff] = useState(false);

  const status = courier?.status || "OFFLINE";
  const onDuty = status !== "OFFLINE";
  const ctx = {
    courierStatus: status,
    offerAccepted: offer ? offer.accepted === true : undefined,
    orderStatus: offer?.orderStatus,
  };

  const command = onDuty ? "goOffDuty" : "goOnDuty";
  const allowed = can(ROLE, command, ctx) && !busy;
  const reason = explain(ROLE, command, ctx);
  const label = onDuty ? "Go off duty" : "Go on duty";

  function handleToggle() {
    if (onDuty && status === "ASSIGNED") {
      setConfirmOff(true);
      return;
    }
    onCommand(label);
  }

  async function confirmOffDuty() {
    setConfirmOff(false);
    await onCommand("Go off duty");
  }

  return (
    <div className={styles.wrap}>
      <section className={`card ${styles.panel}`} aria-label="Courier status">
        <h2 className={styles.panelTitle}>My status</h2>
        <div className={styles.statusRow}>
          <span className={`${styles.statusBadge} ${styles[`status${status}`] || ""}`}>
            {status}
          </span>
          <p className={styles.hint}>{HINTS[status] || ""}</p>
        </div>

        <div className={styles.dutyRow}>
          <button
            type="button"
            role="switch"
            aria-checked={onDuty}
            aria-label={label}
            className={`${styles.switchBtn} ${onDuty ? styles.switchOn : ""}`}
            disabled={!allowed}
            title={reason || (busy ? "Please wait..." : label)}
            onClick={handleToggle}
          >
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
            <span>{onDuty ? "On duty" : "Off duty"}</span>
          </button>
          <span className={styles.hint}>{label} to switch.</span>
        </div>

        {confirmOff && status === "ASSIGNED" && (
          <div className={styles.warning} role="alert">
            <p>
              You have an assigned order. Going off duty will stall it until an operator
              reassigns it. Continue?
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn-danger"
                disabled={busy}
                onClick={confirmOffDuty}
              >
                Yes, go off duty
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmOff(false)}>
                Stay on duty
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={`card ${styles.panel}`} aria-label="What you can do">
        <h2 className={styles.panelTitle}>What you can do</h2>
        <ul className={styles.items}>
          {CAN_DO.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

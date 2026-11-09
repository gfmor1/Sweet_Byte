"use client";

import { can, explain } from "../../services/permissions";
import styles from "./courier.module.css";

const ROLE = "COURIER";

// Delivery-step actions: accept or decline offer, confirm pickup, confirm delivery.
export default function CourierActions({ courier, offer, busy, onCommand }) {
  const status = courier?.status || "OFFLINE";
  const ctx = {
    courierStatus: status,
    offerAccepted: offer ? offer.accepted === true : undefined,
    orderStatus: offer?.orderStatus,
  };

  // Accept and Decline are only shown when an unaccepted order is offered.
  const showOfferChoice = offer && offer.accepted !== true;

  function button(command, label, handler, primary = false) {
    const allowed = can(ROLE, command, ctx) && !busy;
    const reason = explain(ROLE, command, ctx);
    return (
      <button
        type="button"
        className={primary ? styles.primaryBtn : "btn-secondary"}
        disabled={!allowed}
        title={reason || (busy ? "Please wait..." : label)}
        onClick={handler}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={styles.actions} role="group" aria-label="Delivery actions">
      {showOfferChoice && button("acceptOffer", "Accept offer", () => onCommand("Accept offer"), true)}
      {showOfferChoice && button("declineOffer", "Decline offer", () => onCommand("Decline offer"))}
      {button("confirmPickup", "Confirm Pickup", () => onCommand("Confirm pickup"))}
      {button("confirmDelivery", "Confirm Delivery", () => onCommand("Confirm delivery"))}
    </div>
  );
}

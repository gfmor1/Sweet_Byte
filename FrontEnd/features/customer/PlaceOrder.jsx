"use client";

import { useState } from "react";

import { can, explain } from "../../services/permissions";
import { formatEnum } from "../../services/enumApi";
import MenuThumb from "./MenuThumb";
import FarePreview from "../pricing/FarePreview";
import { money } from "../pricing/FareBreakdown";
import styles from "./customer.module.css";

export default function PlaceOrder({
  restaurant,
  onPlaceOrder,
  role = "CUSTOMER",
  onLog,
}) {
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedMenu = [...restaurant.menu].sort((a, b) => {
    const rank =
      (a.status === "AVAILABLE" ? 0 : 1) -
      (b.status === "AVAILABLE" ? 0 : 1);
    if (rank !== 0) return rank;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    });
  });

  const selectedItems = restaurant.menu.filter(
    (item) => (quantities[item.id] || 0) > 0
  );

  const soldOutSelected = selectedItems.filter(
    (item) => item.status !== "AVAILABLE"
  );

  const subtotal = selectedItems.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * quantities[item.id],
    0
  );

  const ctx = {
    restaurantStatus: restaurant.status,
    cartSize: selectedItems.length,
  };

  const blockedReason =
    explain(role, "placeOrder", ctx) ||
    (soldOutSelected.length > 0
      ? `Remove sold-out items from your cart: ${soldOutSelected
          .map((item) => item.name)
          .join(", ")}.`
      : null);

  const canPlaceOrder =
    can(role, "placeOrder", ctx) && soldOutSelected.length === 0;

  function updateQuantity(itemId, value) {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));

    setQuantities((previous) => ({
      ...previous,
      [itemId]: quantity,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    if (!canPlaceOrder) {
      setError(blockedReason || "You cannot place this order.");
      return;
    }

    const orderLines = selectedItems.map((item) => ({
      id: item.id,
      quantity: quantities[item.id],
    }));

    setError("");
    setSubmitting(true);

    try {
      const successful = await onPlaceOrder(orderLines);

      if (successful) {
        setQuantities({});
      }
    } catch (err) {
      setError(err.message || "Could not place your order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="place-order-heading">
      <h2 id="place-order-heading" className={styles.sectionHead}>
        Menu and order
      </h2>

      <p className={styles.meta}>
        Restaurant status:{" "}
        <span
          className={`${styles.badge} ${
            restaurant.status === "OPEN"
              ? styles.open
              : restaurant.status === "PAUSED"
              ? styles.paused
              : styles.closed
          }`}
        >
          {formatEnum(restaurant.status)}
        </span>
      </p>

      {restaurant.menu.length === 0 && (
        <p>This restaurant has no menu items yet.</p>
      )}

      <form onSubmit={handleSubmit}>
        <ul className={styles.menuGrid}>
          {sortedMenu.map((item) => {
            const available = item.status === "AVAILABLE";
            const qty = quantities[item.id] || 0;

            return (
              <li
                key={item.id}
                className={`${styles.menuItem} ${
                  available ? "" : styles.menuSold
                }`}
              >
                <MenuThumb name={item.name} />

                <div className={styles.menuBody}>
                  <h3 className={styles.menuName}>{item.name}</h3>
                  <p className={styles.menuMeta}>
                    <span>{money(item.price)}</span>
                    <span
                      className={`${styles.badge} ${
                        available ? styles.open : styles.sold
                      }`}
                    >
                      {available ? "Available" : "Sold out"}
                    </span>
                  </p>
                </div>

                <div
                  className={styles.stepper}
                  role="group"
                  aria-label={`Quantity of ${item.name}`}
                >
                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-label={`Remove one ${item.name}`}
                    disabled={submitting || qty <= 0}
                    onClick={() => updateQuantity(item.id, qty - 1)}
                  >
                    -
                  </button>
                  <output
                    className={styles.stepQty}
                    aria-live="polite"
                    id={`quantity-${item.id}`}
                  >
                    {qty}
                  </output>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-label={`Add one ${item.name}`}
                    disabled={submitting || !available}
                    title={available ? undefined : "Sold out"}
                    onClick={() => updateQuantity(item.id, qty + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <FarePreview subtotal={subtotal} onLog={onLog} />

        <button
          type="submit"
          disabled={!canPlaceOrder || submitting}
          aria-describedby={
            blockedReason ? "place-order-reason" : undefined
          }
          title={blockedReason || undefined}
        >
          {submitting ? "Placing order..." : "Place Order"}
        </button>

        {blockedReason && (
          <p
            id="place-order-reason"
            className={styles.hint}
            role="status"
          >
            Place Order is unavailable: {blockedReason}
          </p>
        )}
      </form>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </section>
  );
}

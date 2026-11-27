"use client";

import { useEffect, useRef, useState } from "react";

import { validatePromo } from "../../services/promoApi";

import { can, explain } from "../../services/permissions";
import { formatEnum } from "../../services/enumApi";
import MenuThumb from "./MenuThumb";
import DeliveryAddressPicker from "./DeliveryAddressPicker";
import FarePreview from "../pricing/FarePreview";
import { money } from "../pricing/FareBreakdown";
import styles from "./customer.module.css";
import { isValidDelivery } from "./deliveryAddress.mjs";

export default function PlaceOrder({
  restaurant,
  onPlaceOrder: submitOrder,
  onDeliveryChange,
  role = "CUSTOMER",
  onLog,
}) {
  const [quantities, setQuantities] = useState({});
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Promo code: only one code per order. appliedPromo = { code, discount } once accepted.
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const submittingRef = useRef(false);

  useEffect(() => {
    onDeliveryChange?.(delivery);

    return () => onDeliveryChange?.(null);
  }, [delivery, onDeliveryChange]);

  const sortedMenu = [...restaurant.menu].sort((a, b) => {
    const rank =
      (a.status === "AVAILABLE" ? 0 : 1) -
      (b.status === "AVAILABLE" ? 0 : 1);

    if (rank !== 0) return rank;

    return String(a.name || "").localeCompare(
      String(b.name || ""),
      undefined,
      { sensitivity: "base" }
    );
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

  // Cart changed while a code is applied: re-check it, drop it with its refusal text if no longer valid.
  const appliedCode = appliedPromo?.code;
  useEffect(() => {
    if (!appliedCode) return undefined;
    let active = true;

    validatePromo(appliedCode, subtotal)
      .then((result) => {
        if (active) setAppliedPromo(result);
      })
      .catch((err) => {
        if (!active) return;
        setAppliedPromo(null);
        setPromoError(err.message);
      });

    return () => {
      active = false;
    };
  }, [subtotal, appliedCode]);

  async function handleApplyPromo() {
    if (appliedPromo || promoBusy) return;

    setPromoError("");

    if (subtotal <= 0) {
      setPromoError("Add items to your cart before applying a promo code.");
      return;
    }

    setPromoBusy(true);
    try {
      const result = await validatePromo(promoInput, subtotal);
      setAppliedPromo(result);
      setPromoInput(result.code);
      onLog?.({ command: "Apply promo code", result: `${result.code} applied` });
    } catch (err) {
      setPromoError(err.message);
      onLog?.({ command: "Apply promo code", error: err.message });
    } finally {
      setPromoBusy(false);
    }
  }

  // handleSubmit calls this: it adds the applied promo code (one per order) and clears it after success.
  async function onPlaceOrder(orderLines, options) {
    const successful = await submitOrder(orderLines, {
      ...options,
      promoCode: appliedPromo ? appliedPromo.code : null,
    });

    if (successful) {
      setAppliedPromo(null);
      setPromoInput("");
      setPromoError("");
    }

    return successful;
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  const context = {
    restaurantStatus: restaurant.status,
    cartSize: selectedItems.length,
  };

  const blockedReason =
    explain(role, "placeOrder", context) ||
    (soldOutSelected.length > 0
      ? `Remove sold-out items from your cart: ${soldOutSelected
          .map((item) => item.name)
          .join(", ")}.`
      : null) ||
    (!delivery ? "Select a delivery address below." : null);

  const canPlaceOrder =
    can(role, "placeOrder", context) &&
    soldOutSelected.length === 0 &&
    Boolean(delivery);

  function updateQuantity(itemId, value) {
    const quantity = Math.max(
      0,
      Math.floor(Number(value) || 0)
    );

    setQuantities((previous) => ({
      ...previous,
      [itemId]: quantity,
    }));
  }

  function handleDeliveryChange(nextDelivery) {
    setDelivery(nextDelivery);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) return;

    if (!canPlaceOrder) {
      setError(
        blockedReason || "You cannot place this order."
      );
      return;
    }

    if (!isValidDelivery(delivery)) {
  setError("Please select a valid delivery address.");
  return;
}

    const orderLines = selectedItems.map((item) => ({
      id: item.id,
      quantity: quantities[item.id],
    }));

    setError("");
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const successful = await onPlaceOrder(orderLines, {
        subtotal,
        delivery: {
          deliveryAddress: delivery.deliveryAddress.trim(),
          latitude: delivery.latitude,
          longitude: delivery.longitude,
        },
      });

      if (successful) {
        setQuantities({});
      }
    } catch (err) {
      setError(
        err.message || "Could not place your order."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="place-order-heading">
      <h2
        id="place-order-heading"
        className={styles.sectionHead}
      >
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
            const quantity = quantities[item.id] || 0;

            return (
              <li
                key={item.id}
                className={`${styles.menuItem} ${
                  available ? "" : styles.menuSold
                }`}
              >
                <MenuThumb name={item.name} />

                <div className={styles.menuBody}>
                  <h3 className={styles.menuName}>
                    {item.name}
                  </h3>

                  <p className={styles.menuMeta}>
                    <span>{money(item.price)}</span>

                    <span
                      className={`${styles.badge} ${
                        available
                          ? styles.open
                          : styles.sold
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
                    disabled={submitting || quantity <= 0}
                    onClick={() =>
                      updateQuantity(item.id, quantity - 1)
                    }
                  >
                    -
                  </button>

                  <output
                    className={styles.stepQty}
                    aria-live="polite"
                    id={`quantity-${item.id}`}
                  >
                    {quantity}
                  </output>

                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-label={`Add one ${item.name}`}
                    disabled={submitting || !available}
                    title={
                      available ? undefined : "Sold out"
                    }
                    onClick={() =>
                      updateQuantity(item.id, quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <DeliveryAddressPicker
          onChange={handleDeliveryChange}
          disabled={submitting}
        />

        <div className={styles.promoBox}>
        <label htmlFor="promo-code" className={`ui-label ${styles.promoLabel}`}>Promo code</label>
        <div className={styles.promoRow}>
          <input
            id="promo-code"
            type="text"
            value={promoInput}
            placeholder="Enter code"
            autoComplete="off"
            disabled={Boolean(appliedPromo) || promoBusy || submitting}
            onChange={(event) => {
              setPromoInput(event.target.value);
              setPromoError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleApplyPromo();
              }
            }}
            aria-invalid={promoError ? true : undefined}
            aria-describedby={promoError ? "promo-error" : undefined}
          />
          {appliedPromo ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={handleRemovePromo}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              disabled={promoBusy || submitting || !promoInput.trim()}
              onClick={handleApplyPromo}
            >
              {promoBusy ? "Applying..." : "Apply"}
            </button>
          )}
        </div>

        {appliedPromo && (
          <p className={styles.promoApplied} role="status">
            {appliedPromo.code} applied: {money(appliedPromo.discount)} off
          </p>
        )}

        {promoError && (
          <p id="promo-error" className={styles.promoError} role="alert">
            {promoError}
          </p>
        )}
        </div>

        <FarePreview
          subtotal={subtotal}
          promo={appliedPromo}
          onLog={onLog}
        />

        <button
          type="submit"
          disabled={!canPlaceOrder || submitting}
          aria-describedby={
            blockedReason
              ? "place-order-reason"
              : undefined
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
"use client";

import { useState } from "react";

export default function PlaceOrder({ restaurant, onPlaceOrder }) {
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedItems = restaurant.menu.filter(
    (item) => (quantities[item.id] || 0) > 0
  );

  const canPlaceOrder =
    restaurant.status === "OPEN" &&
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.status === "AVAILABLE");

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
      setError("Select available items from an open restaurant.");
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
    <section>
      <h2>Place Order</h2>

      <p>Restaurant status: {restaurant.status}</p>

      <form onSubmit={handleSubmit}>
        {restaurant.menu.map((item) => (
          <div key={item.id} className="order-card">
            <h3>{item.name}</h3>

            <p>Price: ${Number(item.price).toFixed(2)}</p>

            <p>
              {item.status === "AVAILABLE" ? "Available" : "Sold out"}
            </p>

            <label htmlFor={`quantity-${item.id}`}>Quantity</label>

            <input
              id={`quantity-${item.id}`}
              type="number"
              min="0"
              step="1"
              value={quantities[item.id] ?? 0}
              disabled={
                submitting ||
                (item.status !== "AVAILABLE" &&
                  !(quantities[item.id] > 0))
              }
              onChange={(event) =>
                updateQuantity(item.id, event.target.value)
              }
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={!canPlaceOrder || submitting}
        >
          {submitting ? "Placing order..." : "Place Order"}
        </button>
      </form>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </section>
  );
}
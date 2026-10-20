
"use client";

import { useState } from "react";

function PlaceOrder({ restaurant, onPlaceOrder }) {
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const selectedItems = restaurant.menu
      .filter(
        (item) =>
          item.status === "AVAILABLE" &&
          (quantities[item.id] || 0) > 0
      )
      .map((item) => ({
        id: item.id,
        quantity: quantities[item.id],
      }));

    if (selectedItems.length === 0) {
      setMessage("Please select at least one item");
      return;
    }

    if (restaurant.status !== "OPEN") {
      setMessage("Restaurant is not open");
      return;
    }

    setMessage("");
    const placed = await onPlaceOrder(selectedItems);
    if (placed) setQuantities({});
  }

  return (
    <div>
      <h2>Place Order</h2>

      <form onSubmit={handleSubmit}>
        {restaurant.menu.map((item) => (
          <div key={item.id}>
            <p>{item.name}</p>
            <p>Price: ${item.price.toFixed(2)}</p>

            <input
              type="number"
              min="0"
              step="1"
              value={quantities[item.id] ?? 0}
              disabled={item.status !== "AVAILABLE"}
              onChange={(event) =>
                setQuantities({
                  ...quantities,
                  [item.id]: Math.max(
                    0,
                    Math.floor(Number(event.target.value) || 0)
                  ),
                })
              }
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={restaurant.status !== "OPEN"}
        >
          Place Order
        </button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default PlaceOrder;


"use client";

import { useState } from "react";

function PlaceOrder({ restaurant, onPlaceOrder }) {
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const selectedItems = restaurant.menu
      .filter(
        (item) =>
          item.status === "available" &&
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

    if (restaurant.status !== "open") {
      setMessage("Restaurant is not open");
      return;
    }

    onPlaceOrder(selectedItems);
    setMessage("Order sent to dashboard (demo only)");
    setQuantities({});
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
              disabled={item.status !== "available"}
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
          disabled={restaurant.status !== "open"}
        >
          Place Order
        </button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default PlaceOrder;

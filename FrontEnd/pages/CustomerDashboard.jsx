
"use client";

import { useState } from "react";
import RestaurantList from "../features/customer/RestaurantList";
import MenuList from "../features/customer/MenuList";
import PlaceOrder from "../features/customer/PlaceOrder";




function CustomerDashboard({ restaurants, orders, setOrders }) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ||
    null;
  const [message, setMessage] = useState("");

  function handlePlaceOrder(selectedItems) {
    if (!selectedRestaurant) {
      setMessage("Please select a restaurant");
      return;
    }

    const orderItems = selectedItems.map((selectedItem) => {
      const menuItem = selectedRestaurant.menu.find(
        (item) => item.id === selectedItem.id
      );

      return {
        id: selectedItem.id,
        name: menuItem.name,
        quantity: selectedItem.quantity
      };
    });

    setOrders((previousOrders) => [
      ...previousOrders,
      {
        id: previousOrders.length + 1,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        items: orderItems,
        status: "placed"
      }
    ]);

    setMessage("Demo order placed successfully!");
  }

  function handleCancelOrder(orderId) {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.id === orderId && order.status === "placed"
          ? { ...order, status: "cancelled" }
          : order
      )
    );

    setMessage("Demo order cancelled");
  }
return (
  <div className="dashboard">
    <h1>SweetByte</h1>

    {selectedRestaurant ? (
      <div className="menu-section">

        <button
          onClick={() => setSelectedRestaurantId(null)}
        >
          ← Back to Restaurants
        </button>

        <h2>{selectedRestaurant.name}</h2>

        <PlaceOrder
  key={selectedRestaurant.id}
  restaurant={selectedRestaurant}
  onPlaceOrder={handlePlaceOrder}
/>

        <p>{message}</p>
      </div>
    ) : (
      <>
        <h2>Customer Dashboard</h2>

        <RestaurantList
          restaurants={restaurants}
          onSelect={(restaurant) => {
            setMessage("");
            setSelectedRestaurantId(restaurant.id);
          }}
        />

        <h2>My Orders</h2>

        {orders.length === 0 && (
          <p>You have no orders yet.</p>
        )}

        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <h3>Order #{order.id}</h3>

            <p>Restaurant: {order.restaurantName}</p>
            <p>Status: {order.status}</p>

            {order.items.map((item) => (
              <p key={item.id}>
                {item.name} x {item.quantity}
              </p>
            ))}

            {order.status === "placed" && (
              <button
                onClick={() => handleCancelOrder(order.id)}
              >
                Cancel Order
              </button>
            )}
          </div>
        ))}

        <p>{message}</p>
      </>
    )}
  </div>
);

}

export default CustomerDashboard;

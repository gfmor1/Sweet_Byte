
"use client";

import { useEffect, useState } from "react";
import RestaurantList from "../features/customer/RestaurantList";
import PlaceOrder from "../features/customer/PlaceOrder";
import { getMenu, getRestaurants } from "../services/restaurantApi";
import { cancelOrder, getMyOrders, placeOrder } from "../services/orderApi";
import { formatEnum } from "../services/enumApi";

function CustomerDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    try {
      const [restaurantList, orderList] = await Promise.all([
        getRestaurants(),
        getMyOrders()
      ]);
      setRestaurants(restaurantList);
      setOrders(orderList);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSelectRestaurant(restaurant) {
    setMessage("");
    try {
      const menu = await getMenu(restaurant.id);
      setSelectedRestaurant({ ...restaurant, menu });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handlePlaceOrder(selectedItems) {
    try {
      const order = await placeOrder(selectedRestaurant.id, selectedItems);
      setOrders((previousOrders) => [...previousOrders, order]);
      setMessage(`Order #${order.id} placed successfully!`);
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function handleCancelOrder(orderId) {
    try {
      await cancelOrder(orderId);
      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === orderId ? { ...order, status: "CANCELLED" } : order
        )
      );
      setMessage(`Order #${orderId} cancelled`);
    } catch (error) {
      setMessage(error.message);
    }
  }

return (
  <div className="dashboard">
    <h1>SweetByte</h1>

    {selectedRestaurant ? (
      <div className="menu-section">

        <button
          onClick={() => {
            setMessage("");
            setSelectedRestaurant(null);
          }}
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
          onSelect={handleSelectRestaurant}
        />

        <h2>My Orders</h2>

        {orders.length === 0 && (
          <p>You have no orders yet.</p>
        )}

        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <h3>Order #{order.id}</h3>

            <p>Restaurant: {order.restaurantName}</p>
            <p>Status: {formatEnum(order.status)}</p>

            {order.items.map((item) => (
              <p key={item.id}>
                {item.name} x {item.quantity}
              </p>
            ))}

            {order.status === "PLACED" && (
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


"use client";

import { useState } from "react";
import RestaurantList from "../features/customer/RestaurantList";
import MenuList from "../features/customer/MenuList";
import PlaceOrder from "../features/customer/PlaceOrder";


const restaurants = [
  {
    id: 1,
    name: "SweetByte Bakery",
    status: "open",
    menu: [
      { id: 101, name: "Chocolate Cake", price: 8, status: "available" },
      { id: 102, name: "Cookies", price: 5, status: "available" },
      { id: 103, name: "Brownies", price: 6, status: "sold_out" },
      { id: 104, name: "Red Velvet Cake", price: 9, status: "available" },
      { id: 105, name: "Cinnamon Rolls", price: 5, status: "available" }
    ]
  },
  {
    id: 2,
    name: "Dessert Corner",
    status: "paused",
    menu: [
      { id: 201, name: "Cupcakes", price: 4, status: "available" },
      { id: 202, name: "Cheesecake", price: 8, status: "available" },
      { id: 203, name: "Macarons", price: 7, status: "available" },
      { id: 204, name: "Tiramisu", price: 9, status: "available" },
      { id: 205, name: "Strawberry Shortcake", price: 8, status: "available" }
    ]
  },
  {
    id: 3,
    name: "Sugar Rush Donuts",
    status: "open",
    menu: [
      { id: 301, name: "Glazed Donut", price: 3, status: "available" },
      { id: 302, name: "Boston Cream", price: 4, status: "available" },
      { id: 303, name: "Strawberry Donut", price: 4, status: "available" },
      { id: 304, name: "Maple Donut", price: 4, status: "sold_out" },
      { id: 305, name: "Nutella Donut", price: 5, status: "available" }
    ]
  },
  {
    id: 4,
    name: "Gelato Heaven",
    status: "open",
    menu: [
      { id: 401, name: "Vanilla Gelato", price: 5, status: "available" },
      { id: 402, name: "Pistachio Gelato", price: 6, status: "available" },
      { id: 403, name: "Mango Sorbet", price: 5, status: "available" },
      { id: 404, name: "Chocolate Gelato", price: 5, status: "available" },
      { id: 405, name: "Strawberry Gelato", price: 5, status: "available" }
    ]
  },
  {
    id: 5,
    name: "Waffle Wonderland",
    status: "open",
    menu: [
      { id: 501, name: "Belgian Waffle", price: 7, status: "available" },
      { id: 502, name: "Nutella Waffle", price: 9, status: "available" },
      { id: 503, name: "Strawberry Waffle", price: 9, status: "available" },
      { id: 504, name: "Oreo Waffle", price: 10, status: "available" },
      { id: 505, name: "Caramel Waffle", price: 8, status: "sold_out" }
    ]
  },
  {
    id: 6,
    name: "Choco Paradise",
    status: "open",
    menu: [
      { id: 601, name: "Chocolate Lava Cake", price: 10, status: "available" },
      { id: 602, name: "Chocolate Mousse", price: 8, status: "available" },
      { id: 603, name: "Chocolate Fondue", price: 12, status: "available" },
      { id: 604, name: "Chocolate Truffles", price: 7, status: "available" },
      { id: 605, name: "Fudge Cake", price: 9, status: "available" }
    ]
  },
  {
    id: 7,
    name: "Parisian Sweets",
    status: "closed",
    menu: [
      { id: 701, name: "Creme Brulee", price: 9, status: "available" },
      { id: 702, name: "Eclair", price: 6, status: "available" },
      { id: 703, name: "Fruit Tart", price: 8, status: "available" },
      { id: 704, name: "Mille-Feuille", price: 10, status: "available" },
      { id: 705, name: "Lemon Meringue Tart", price: 8, status: "available" }
    ]
  }
];



function CustomerDashboard() {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
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
          onClick={() => setSelectedRestaurant(null)}
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
          onSelect={setSelectedRestaurant}
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

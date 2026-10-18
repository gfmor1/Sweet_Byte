"use client";

import { useState } from "react";

function MenuItemEditor({ item, onUpdateItem, onRemoveItem }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [message, setMessage] = useState("");

  function handleSave(event) {
    event.preventDefault();

    const parsedPrice = Number(price);

    if (name.trim() === "") {
      setMessage("Name cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage("Price must be greater than 0");
      return;
    }

    onUpdateItem(item.id, { name: name.trim(), price: parsedPrice });
    setMessage("Saved");
  }

  function handleToggleStatus() {
    onUpdateItem(item.id, {
      status: item.status === "available" ? "sold_out" : "available"
    });
  }

  return (
    <div>
      <h3>{item.name}</h3>
      <p>Price: ${item.price.toFixed(2)}</p>
      <p>
        Status: {item.status === "available" ? "Available" : "Sold Out"}
      </p>

      <form onSubmit={handleSave}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <button type="submit">Save</button>
      </form>

      <button onClick={handleToggleStatus}>
        {item.status === "available"
          ? "Mark Sold Out"
          : "Mark Available"}
      </button>{" "}
      <button onClick={() => onRemoveItem(item.id)}>Remove</button>

      <p>{message}</p>
    </div>
  );
}

function AddItemForm({ onAddItem }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const parsedPrice = Number(price);

    if (name.trim() === "") {
      setMessage("Name cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage("Price must be greater than 0");
      return;
    }

    onAddItem(name.trim(), parsedPrice);
    setName("");
    setPrice("");
    setMessage("");
  }

  return (
    <div>
      <h2>Add Menu Item</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Item name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <button type="submit">Add Item</button>
      </form>

      <p>{message}</p>
    </div>
  );
}

function ManageMenu({
  restaurant,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onUpdateStatus
}) {
  return (
    <div>
      <h2>Manage Restaurant</h2>

      <p>Restaurant status: {restaurant.status}</p>

      <button
        onClick={() => onUpdateStatus("open")}
        disabled={restaurant.status === "open"}
      >
        Open
      </button>{" "}
      <button
        onClick={() => onUpdateStatus("paused")}
        disabled={restaurant.status === "paused"}
      >
        Pause
      </button>{" "}
      <button
        onClick={() => onUpdateStatus("closed")}
        disabled={restaurant.status === "closed"}
      >
        Close
      </button>

      <div className="menu-list">
        <h2>Menu</h2>

        {restaurant.menu.map((item) => (
          <MenuItemEditor
            key={item.id}
            item={item}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>

      <AddItemForm onAddItem={onAddItem} />
    </div>
  );
}

export default ManageMenu;

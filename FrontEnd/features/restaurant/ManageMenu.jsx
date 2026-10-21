"use client";

import { useState } from "react";
import { StatusMessage, useStatus } from "../../components/StatusMessage";
import { formatEnum } from "../../services/enumApi";

function MenuItemEditor({ item, onUpdateItem, onRemoveItem }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [status, show] = useStatus();

  function handleSave(event) {
    event.preventDefault();

    const parsedPrice = Number(price);

    if (name.trim() === "") {
      show.error("Name cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      show.error("Price must be greater than 0");
      return;
    }

    onUpdateItem(item.id, { name: name.trim(), price: parsedPrice });
    show.success("Saved");
  }

  function handleToggleStatus() {
    onUpdateItem(item.id, {
      status: item.status === "AVAILABLE" ? "SOLD_OUT" : "AVAILABLE"
    });
  }

  return (
    <div>
      <h3>{item.name}</h3>
      <p>Price: ${item.price.toFixed(2)}</p>
      <p>
        Status: {formatEnum(item.status)}
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
        {item.status === "AVAILABLE"
          ? "Mark Sold Out"
          : "Mark Available"}
      </button>{" "}
      <button onClick={() => onRemoveItem(item.id)}>Remove</button>

      <StatusMessage status={status} />
    </div>
  );
}

function AddItemForm({ onAddItem }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, show] = useStatus();

  function handleSubmit(event) {
    event.preventDefault();

    const parsedPrice = Number(price);

    if (name.trim() === "") {
      show.error("Name cannot be empty");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      show.error("Price must be greater than 0");
      return;
    }

    onAddItem(name.trim(), parsedPrice);
    setName("");
    setPrice("");
    show.clear();
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

      <StatusMessage status={status} />
    </div>
  );
}

function ManageMenu({
  restaurant,
  restaurantStatuses,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onUpdateStatus
}) {
  return (
    <div>
      <h2>Manage Restaurant</h2>

      <p>Restaurant status: {formatEnum(restaurant.status)}</p>

      {restaurantStatuses.map((status) => (
        <button
          key={status}
          onClick={() => onUpdateStatus(status)}
          disabled={restaurant.status === status}
        >
          {formatEnum(status)}
        </button>
      ))}

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

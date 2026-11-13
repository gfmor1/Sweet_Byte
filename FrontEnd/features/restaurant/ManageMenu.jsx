"use client";

import { useState } from "react";
import { StatusMessage, useStatus } from "../../components/StatusMessage";
import { formatEnum } from "../../services/enumApi";
import { explain, ROLES } from "../../services/permissions";
import styles from "./restaurant.module.css";

const ROLE = ROLES.RESTAURANT_OWNER;

function validate(name, price) {
  if (name.trim() === "") return "Name cannot be empty";
  const parsed = Number(price);
  if (price === "" || !Number.isFinite(parsed) || parsed <= 0) {
    return "Price must be greater than 0";
  }
  return null;
}

function Icon({ children }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PencilIcon = () => (
  <Icon>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Icon>
);
const BanIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </Icon>
);
const CheckIcon = () => (
  <Icon>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);
const TrashIcon = () => (
  <Icon>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 14h10l1-14" />
  </Icon>
);

function MenuItemRow({ item, busy, onUpdateItem, onRemoveItem }) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [status, show] = useStatus();
  const nameId = `item-name-${item.id}`;
  const priceId = `item-price-${item.id}`;
  const busyHint = busy ? "Another action is in progress." : undefined;
  const soldOut = item.status === "SOLD_OUT";

  const dirty = name.trim() !== item.name || Number(price) !== Number(item.price);

  function stopEditing() {
    setEditing(false);
    setName(item.name);
    setPrice(String(item.price));
    show.clear();
  }

  async function handleSave(event) {
    event.preventDefault();

    const problem = validate(name, price);
    if (problem) {
      show.error(problem);
      return;
    }

    const ok = await onUpdateItem(item.id, { name: name.trim(), price: Number(price) });
    if (ok) {
      show.clear();
      setEditing(false);
    } else {
      show.clear();
    }
  }

  function handleToggleStatus() {
    onUpdateItem(item.id, { status: soldOut ? "AVAILABLE" : "SOLD_OUT" });
  }

  async function handleRemove() {
    const ok = await onRemoveItem(item.id);
    if (!ok) setConfirmingRemove(false);
  }

  const toggleLabel = soldOut ? `Mark ${item.name} available` : `Mark ${item.name} sold out`;

  return (
    <li className={`card ${styles.menuRow}`}>
      {editing ? (
        <form onSubmit={handleSave} className={styles.rowForm} noValidate>
          <div className={styles.rowInputs}>
            <label htmlFor={nameId} className={styles.srOnly}>
              Name
            </label>
            <input
              id={nameId}
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <label htmlFor={priceId} className={styles.srOnly}>
              Price
            </label>
            <input
              id={priceId}
              type="number"
              min="0"
              step="0.01"
              className={styles.priceInput}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price"
            />
          </div>
          {dirty && (
            <button type="submit" className={styles.smallBtn} disabled={busy} title={busyHint}>
              Save
            </button>
          )}
        </form>
      ) : (
        <div className={styles.rowMain}>
          <span className={styles.rowName}>{item.name}</span>
          <span className={styles.rowPrice}>${Number(item.price).toFixed(2)}</span>
        </div>
      )}

      <div className={styles.rowSide}>
        <span className={`chip ${soldOut ? "" : "chip-active"}`}>{formatEnum(item.status)}</span>

        {confirmingRemove ? (
          <span className={styles.confirmRemove} role="group" aria-label={`Confirm remove ${item.name}`}>
            <span>Remove?</span>
            <button
              type="button"
              className={`btn-danger ${styles.smallBtn}`}
              onClick={handleRemove}
              disabled={busy}
              title={busyHint}
            >
              Yes
            </button>
            <button
              type="button"
              className={`btn-secondary ${styles.smallBtn}`}
              onClick={() => setConfirmingRemove(false)}
            >
              No
            </button>
          </span>
        ) : (
          <span className={styles.iconGroup}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => (editing ? stopEditing() : setEditing(true))}
              aria-label={editing ? `Cancel editing ${item.name}` : `Edit ${item.name}`}
              title={editing ? "Cancel editing" : "Edit name and price"}
              aria-pressed={editing}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={handleToggleStatus}
              disabled={busy}
              aria-label={toggleLabel}
              title={busyHint || (soldOut ? "Mark available" : "Mark sold out")}
            >
              {soldOut ? <CheckIcon /> : <BanIcon />}
            </button>
            <button
              type="button"
              className="btn-icon btn-danger"
              onClick={() => setConfirmingRemove(true)}
              disabled={busy}
              aria-label={`Remove ${item.name}`}
              title={busyHint || "Remove from menu"}
            >
              <TrashIcon />
            </button>
          </span>
        )}
      </div>

      <div aria-live="polite" className={styles.rowStatus}>
        <StatusMessage status={status} />
      </div>
    </li>
  );
}

function AddItemForm({ busy, onAddItem }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, show] = useStatus();

  async function handleSubmit(event) {
    event.preventDefault();

    const problem = validate(name, price);
    if (problem) {
      show.error(problem);
      return;
    }

    const ok = await onAddItem(name.trim(), Number(price));
    if (ok) {
      setName("");
      setPrice("");
    }
    show.clear();
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        + Add item
      </button>
    );
  }

  return (
    <div className={`card ${styles.addRow}`}>
      <form onSubmit={handleSubmit} className={styles.rowForm} noValidate>
        <div className={styles.rowInputs}>
          <label htmlFor="new-item-name" className={styles.srOnly}>
            Item name
          </label>
          <input
            id="new-item-name"
            type="text"
            className={styles.nameInput}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Item name"
          />
          <label htmlFor="new-item-price" className={styles.srOnly}>
            Price
          </label>
          <input
            id="new-item-price"
            type="number"
            min="0"
            step="0.01"
            className={styles.priceInput}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Price"
          />
        </div>
        <span className={styles.iconGroup}>
          <button
            type="submit"
            className={styles.smallBtn}
            disabled={busy}
            title={busy ? "Another action is in progress." : undefined}
          >
            Add
          </button>
          <button
            type="button"
            className={`btn-secondary ${styles.smallBtn}`}
            onClick={() => {
              setOpen(false);
              show.clear();
            }}
          >
            Close
          </button>
        </span>
      </form>
      <StatusMessage status={status} />
    </div>
  );
}

const byName = (a, b) => a.name.localeCompare(b.name);

function ManageMenu({ restaurant, busy, onUpdateItem, onAddItem, onRemoveItem }) {
  const editBlocked = explain(ROLE, "editMenu");

  const available = restaurant.menu.filter((item) => item.status !== "SOLD_OUT").sort(byName);
  const soldOut = restaurant.menu.filter((item) => item.status === "SOLD_OUT").sort(byName);
  const sorted = [...available, ...soldOut];

  return (
    <section className={styles.section} aria-labelledby="manage-heading">
      <div className={styles.menuHeader}>
        <h3 id="manage-heading" className={styles.sectionTitle}>
          Menu ({restaurant.menu.length})
        </h3>
        {!editBlocked && <AddItemForm busy={busy} onAddItem={onAddItem} />}
      </div>

      {editBlocked ? (
        <p className={styles.empty}>{editBlocked}</p>
      ) : sorted.length === 0 ? (
        <p className={styles.empty}>The menu is empty. Add your first item above.</p>
      ) : (
        <ul className={styles.menuList}>
          {sorted.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              busy={busy}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default ManageMenu;

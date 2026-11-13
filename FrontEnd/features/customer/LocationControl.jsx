"use client";

import styles from "./customer.module.css";

const fmt = (n) => Number(n).toFixed(4);

// Presentational: state lives in CustomerDashboard.
export default function LocationControl({
  saved,
  draft,
  picking,
  onStart,
  onSave,
  onCancel,
  onClear,
}) {
  return (
    <div className={styles.locationBox}>
      <div className={styles.locationButtons}>
        {!picking ? (
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={false}
            aria-label="Set my delivery location on the map"
            onClick={onStart}
          >
            Set my location
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary"
              aria-pressed={true}
              aria-label="Stop setting my location"
              onClick={onCancel}
            >
              Set my location
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!draft}
              aria-label="Save my delivery location"
              onClick={onSave}
            >
              Save
            </button>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Cancel setting my location"
              onClick={onCancel}
            >
              Cancel
            </button>
            {saved && (
              <button
                type="button"
                className="btn-ghost"
                aria-label="Clear my saved delivery location"
                onClick={onClear}
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>

      <p className={styles.locationNote}>
        Delivery location:{" "}
        {saved
          ? `${fmt(saved.latitude)}, ${fmt(saved.longitude)} (simulated, saved in this browser)`
          : "Not set"}
        . The real backend still uses the address on file for your order.
      </p>
      {picking && (
        <p className={styles.locationNote} role="status">
          Click the map to set your delivery location
          {draft ? ` (selected ${fmt(draft.latitude)}, ${fmt(draft.longitude)})` : ""}.
        </p>
      )}
    </div>
  );
}

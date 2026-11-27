"use client";

import { useEffect, useRef } from "react";

import styles from "./noticeModal.module.css";

// Centered alert dialog for messages the user must not miss (native <dialog>: Esc, focus trap, backdrop).
// Esc / backdrop click / Close dismiss it.
export default function NoticeModal({ title, message, actionLabel, onAction, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
    closeRef.current.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="alertdialog"
      aria-labelledby="notice-title"
      aria-describedby="notice-message"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={styles.icon} aria-hidden="true">!</div>
      <h2 id="notice-title" className={styles.title}>{title}</h2>
      <p id="notice-message" className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
        <button type="button" className="btn-secondary" ref={closeRef} onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
}

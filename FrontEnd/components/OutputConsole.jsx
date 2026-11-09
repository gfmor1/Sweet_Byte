"use client";

import { useEffect, useRef, useState } from "react";
import { useConsole } from "./ConsoleContext";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-CA", { hour12: false });
}

export default function OutputConsole() {
  const { entries, clear } = useConsole();
  const listRef = useRef(null);
  const [open, setOpen] = useState(true);

  // Collapsed by default on small screens (decided once, after mount).
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length, open]);

  const bodyId = "output-console-body";
  const last = entries[entries.length - 1];

  return (
    <>
      {/* In-flow spacer so the fixed console never covers page content */}
      <div className={open ? "output-console-spacer is-open" : "output-console-spacer"} aria-hidden="true" />
      <section className={open ? "output-console is-open" : "output-console"} aria-label="Output console">
        <div className="output-console-header">
          <button
            type="button"
            className="output-console-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true">{open ? "▾" : "▴"}</span> Output Console
            {entries.length > 0 && <span className="output-console-count">{entries.length}</span>}
          </button>
          {!open && last && (
            <span className={last.error ? "output-console-last console-error" : "output-console-last"}>
              {last.command}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={clear} disabled={entries.length === 0}>
            Clear
          </button>
        </div>

        {open && (
          <div
            id={bodyId}
            ref={listRef}
            className="output-console-body"
            role="log"
            aria-live="polite"
            tabIndex={0}
          >
            {entries.length === 0 ? (
              <p className="output-console-empty">No commands yet.</p>
            ) : (
              entries.map((entry) => (
                <p
                  key={entry.id}
                  className={entry.error ? "console-line console-error" : "console-line"}
                >
                  <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>{" "}
                  <strong>{entry.command}</strong>
                  {entry.error ? (
                    <span> - ERROR: {entry.error}</span>
                  ) : entry.result !== undefined ? (
                    <span> - {typeof entry.result === "string" ? entry.result : JSON.stringify(entry.result)}</span>
                  ) : null}
                </p>
              ))
            )}
          </div>
        )}
      </section>
    </>
  );
}

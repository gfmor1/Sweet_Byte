"use client";

import { useId, useRef, useState } from "react";

/**
 * <Tabs tabs={[{ id, label, badge?, content }]} defaultTab? ariaLabel? activeTab? onTabChange? />
 * Uncontrolled by default; pass activeTab (+ onTabChange) to control it from a parent.
 * Only the active panel is rendered.
 */
export default function Tabs({ tabs = [], defaultTab, ariaLabel = "Sections", activeTab, onTabChange }) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultTab ?? tabs[0]?.id);
  const refs = useRef({});

  const controlled = activeTab !== undefined;
  const current = controlled ? activeTab : internal;
  const active = tabs.find((tab) => tab.id === current) ?? tabs[0];

  function select(id, focus = false) {
    if (!controlled) setInternal(id);
    onTabChange?.(id);
    if (focus) refs.current[id]?.focus();
  }

  function handleKeyDown(event, index) {
    let next = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    select(tabs[next].id, true);
  }

  if (tabs.length === 0) return null;

  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "tabs-tab tabs-tab-active" : "tabs-tab"}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && (
                <span className="tabs-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="tabs-panel"
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
      >
        {active.content}
      </div>
    </div>
  );
}

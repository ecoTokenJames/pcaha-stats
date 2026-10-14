"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pcaha-dismissed-notes";
const CHANGE_EVENT = "pcaha-dismissed-change";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * An explainer box with a ✕. Once dismissed it stays hidden on this device
 * (remembered in the browser; nothing is sent anywhere).
 */
export function DismissibleNote({
  id,
  className = "",
  children,
}: {
  /** Stable name for this note, e.g. "leaders-tournaments" */
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed().includes(id),
    () => false
  );
  if (dismissed) return null;

  return (
    <div
      className={`relative rounded-lg border border-blue-100 bg-blue-50 py-3 pl-4 pr-10 text-sm text-blue-900 ${className}`}
    >
      {children}
      <button
        type="button"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify([...new Set([...readDismissed(), id])])
            );
          } catch {
            // Storage blocked (private mode): nothing to remember, just carry on
          }
          window.dispatchEvent(new Event(CHANGE_EVENT));
        }}
        className="absolute right-2 top-2 rounded p-1 text-blue-700/70 hover:bg-blue-100 hover:text-blue-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

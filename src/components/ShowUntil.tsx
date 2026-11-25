"use client";

import { useSyncExternalStore } from "react";

/**
 * Renders its children until `until` (ISO timestamp), then hides them in the
 * visitor's browser, without waiting for the next site rebuild. A page left
 * open across the cut-off hides them too. Server render: shown (the build
 * leaves ads out entirely once the time has passed).
 */
export function ShowUntil({
  until,
  children,
}: {
  until: string;
  children: React.ReactNode;
}) {
  const end = Date.parse(until);
  const visible = useSyncExternalStore(
    (onChange) => {
      const ms = end - Date.now();
      if (ms <= 0) return () => {};
      // setTimeout can't wait more than ~24.8 days; the page will be reloaded long before then
      const timer = setTimeout(onChange, Math.min(ms, 2 ** 31 - 1));
      return () => clearTimeout(timer);
    },
    () => Date.now() < end,
    () => true
  );
  return visible ? <>{children}</> : null;
}

/**
 * The opposite of ShowUntil: hidden until `from`, then shown in the visitor's
 * browser (a page left open across the switch-over shows it too). Server
 * render: hidden, so pages built before `from` don't flash it.
 */
export function ShowFrom({
  from,
  children,
}: {
  from: string;
  children: React.ReactNode;
}) {
  const start = Date.parse(from);
  const visible = useSyncExternalStore(
    (onChange) => {
      const ms = start - Date.now();
      if (ms <= 0) return () => {};
      const timer = setTimeout(onChange, Math.min(ms, 2 ** 31 - 1));
      return () => clearTimeout(timer);
    },
    () => Date.now() >= start,
    () => false
  );
  return visible ? <>{children}</> : null;
}

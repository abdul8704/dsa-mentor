"use client";

import type { ReactNode } from "react";
import { spotlight } from "./interaction";

/**
 * Dashboard card: sheen surface, hover lift and a pointer-following glow.
 * `title` and `hint` form the header; `action` sits on the right.
 */
export default function Card({
  title,
  hint,
  action,
  hero = false,
  className = "",
  children,
  labelledBy,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  hero?: boolean;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      className={`dash-card dash-spot ${hero ? "dash-hero" : ""} ${className}`}
      onPointerMove={spotlight}
      aria-labelledby={labelledBy}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 relative z-[1]">
          {title && (
            <h2 id={labelledBy} className="dash-card-title">
              {title}
            </h2>
          )}
          {hint && <span className="dash-card-hint">{hint}</span>}
          {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className="relative z-[1] flex flex-col gap-4 min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** Empty / no-data state inside a card. */
export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 py-8 flex-1">
      <span className="material-symbols-outlined text-[32px] text-[color:var(--dash-content-tertiary)]" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-semibold text-[color:var(--dash-content-secondary)]">{title}</p>
      {hint && <p className="text-xs text-[color:var(--dash-content-tertiary)] max-w-xs">{hint}</p>}
    </div>
  );
}

/** ▲/▼ change chip. `suffix` is "%" for percentages. */
export function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span className={`dash-chip dash-num ${up ? "dash-chip-good" : "dash-chip-bad"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

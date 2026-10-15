"use client";

import { useCallback, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Pointer tooltip for chart marks. Charts also carry an accessible name and a
 * data alternative, so the tooltip is a convenience, never the only path.
 */
export function useChartTip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const show = useCallback((e: MouseEvent | PointerEvent, content: ReactNode) => {
    setTip({ x: e.clientX, y: e.clientY, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  const node =
    tip && typeof document !== "undefined"
      ? createPortal(
          <div className="dashboard-shell-tip">
            <div className="dash-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
              {tip.content}
            </div>
          </div>,
          document.body
        )
      : null;

  return { show, hide, node };
}

/** Moves the card spotlight (.dash-spot) to follow the pointer. */
export function spotlight(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Click ripple for .dash-btn / .dash-seg buttons (skipped under reduced motion). */
export function ripple(e: PointerEvent<HTMLElement>) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const dot = document.createElement("span");
  dot.className = "dash-ripple";
  dot.style.width = dot.style.height = `${size}px`;
  dot.style.left = `${e.clientX - r.left - size / 2}px`;
  dot.style.top = `${e.clientY - r.top - size / 2}px`;
  el.appendChild(dot);
  dot.addEventListener("animationend", () => dot.remove());
}

/** Segmented control (tabs / ranges). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="dash-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

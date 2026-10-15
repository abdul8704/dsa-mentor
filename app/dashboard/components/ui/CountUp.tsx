"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a number that counts up from 0 on first mount. The server renders
 * the final value, so there is no hydration mismatch and no-JS readers see the
 * real number; reduced-motion users get the final value immediately. The
 * animation writes to the DOM node directly, so it costs no re-renders.
 */
export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const final = value.toLocaleString();
    if (played.current || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = final;
      return;
    }
    played.current = true;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      el.textContent = Math.round(value * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = final;
    };
  }, [value, duration]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

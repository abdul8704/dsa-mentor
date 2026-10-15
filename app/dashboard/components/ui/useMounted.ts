import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during SSR and hydration, true afterwards. For values that depend on
 * the viewer's clock or timezone (dates, countdowns), which would otherwise
 * cause a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

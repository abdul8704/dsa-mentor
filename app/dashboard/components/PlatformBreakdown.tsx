import type { PlatformCounts } from "@/app/lib/types/analytics";

const PLATFORM_LABELS: Record<string, { short: string; name: string }> = {
  leetcode: { short: "LC", name: "LeetCode" },
  codeforces: { short: "CF", name: "Codeforces" },
  atcoder: { short: "AC", name: "AtCoder" },
  cses: { short: "CSES", name: "CSES" },
};

/**
 * One compact line under a solve count saying where those solves came from,
 * e.g. "LC 3 · CSES 2". Only platforms with at least one solve are listed;
 * renders nothing when there are none.
 */
export default function PlatformBreakdown({
  counts,
  className = "",
}: {
  counts?: PlatformCounts | null;
  className?: string;
}) {
  const entries = Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) return null;

  return (
    <span
      className={`flex flex-wrap gap-x-1.5 gap-y-0.5 leading-tight text-[color:var(--dash-content-tertiary)] ${className}`}
      style={{ fontFamily: "var(--font-geist-mono)", fontSize: "var(--dash-text-caption)" }}
    >
      {entries.map(([platform, n], i) => {
        const label = PLATFORM_LABELS[platform] ?? { short: platform, name: platform };
        return (
          <span key={platform} title={`${n} on ${label.name}`} className="whitespace-nowrap">
            {i > 0 && <span aria-hidden="true">· </span>}
            {label.short} <span className="font-semibold text-[color:var(--dash-content-secondary)]">{n}</span>
          </span>
        );
      })}
    </span>
  );
}

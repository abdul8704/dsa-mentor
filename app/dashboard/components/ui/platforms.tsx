/**
 * Platform identity used across the dashboard: display name, short code, the
 * chart series colour token, and the logo. Logos identify a platform in text;
 * the series colour is only for chart marks (bars, lines, legend keys).
 */

export type PlatformKey = "codeforces" | "leetcode" | "atcoder" | "cses";

/** Fixed display order, so every breakdown lists platforms the same way. */
export const PLATFORM_ORDER: PlatformKey[] = ["codeforces", "leetcode", "atcoder", "cses"];

export const PLATFORMS: Record<PlatformKey, { name: string; short: string; color: string }> = {
  codeforces: { name: "Codeforces", short: "CF", color: "var(--dash-platform-codeforces)" },
  leetcode: { name: "LeetCode", short: "LC", color: "var(--dash-platform-leetcode)" },
  atcoder: { name: "AtCoder", short: "AC", color: "var(--dash-platform-atcoder)" },
  cses: { name: "CSES", short: "CSES", color: "var(--dash-platform-cses)" },
};

/** Case-insensitive lookup; unknown platforms fall back to a neutral entry. */
export function platformMeta(platform: string): { key: string; name: string; short: string; color: string } {
  const key = platform.toLowerCase();
  const meta = PLATFORMS[key as PlatformKey];
  return meta ? { key, ...meta } : { key, name: platform, short: platform, color: "var(--dash-chart-cat-8)" };
}

const LC_BODY =
  "M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0z";
const LC_BAR =
  "M10.617 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z";

/**
 * Official LeetCode and Codeforces marks. AtCoder and CSES have no mark we can
 * ship, so they get a monogram chip (drop an official SVG in here to swap it).
 * Always decorative: pair with the platform name or an aria-label nearby.
 */
export function PlatformLogo({ platform, size = 16 }: { platform: string; size?: number }) {
  const key = platform.toLowerCase();
  if (key === "leetcode") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
        <path d={LC_BODY} fill="#FFA116" />
        <path d={LC_BAR} fill="#B3B3B3" />
      </svg>
    );
  }
  if (key === "codeforces") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
        <rect x="0" y="7.5" width="6" height="13.5" rx="1.5" fill="#F8C326" />
        <rect x="9" y="3" width="6" height="18" rx="1.5" fill="#1E83C6" />
        <rect x="18" y="10.5" width="6" height="10.5" rx="1.5" fill="#E2463F" />
      </svg>
    );
  }
  const label = key === "atcoder" ? "AtC" : key === "cses" ? "CS" : platform.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="dash-monogram"
      style={{ height: size, minWidth: size, padding: "0 2px", fontSize: Math.round(size * (label.length > 2 ? 0.44 : 0.52)) }}
    >
      {label}
    </span>
  );
}

/** Logo + name, for tables and lists. */
export function PlatformBadge({ platform, size = 14 }: { platform: string; size?: number }) {
  const meta = platformMeta(platform);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[color:var(--dash-content-secondary)]">
      <PlatformLogo platform={meta.key} size={size} />
      {meta.name}
    </span>
  );
}

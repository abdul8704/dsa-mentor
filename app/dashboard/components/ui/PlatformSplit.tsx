"use client";

import type { PlatformCounts } from "@/app/lib/types/analytics";
import { PLATFORM_ORDER, PLATFORMS, PlatformLogo, platformMeta } from "./platforms";
import { useChartTip } from "./interaction";

/** Known platforms first in fixed order, then any extra keys the data carries. */
function entriesOf(counts?: PlatformCounts | null): [string, number][] {
  const c = counts ?? {};
  const extra = Object.keys(c).filter((k) => !(k in PLATFORMS));
  return [...PLATFORM_ORDER, ...extra].map((k) => [k, c[k] ?? 0]);
}

/**
 * Where a solve count came from: a segmented bar (the mix at a glance) plus
 * one labelled row per platform with its exact count, so colour is never the
 * only cue. Zero rows stay listed but dimmed.
 */
export default function PlatformSplit({
  counts,
  bar = true,
  columns = 1,
}: {
  counts?: PlatformCounts | null;
  bar?: boolean;
  columns?: 1 | 2;
}) {
  const entries = entriesOf(counts);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const tip = useChartTip();

  return (
    <div className="flex flex-col gap-2.5">
      {bar && (
        <div className="dash-split" role="img" aria-label={entries.map(([k, n]) => `${platformMeta(k).name} ${n}`).join(", ")}>
          {total > 0 &&
            entries
              .filter(([, n]) => n > 0)
              .map(([k, n]) => (
                <i
                  key={k}
                  className="dash-anim-grow-x"
                  style={{ width: `${(n / total) * 100}%`, background: platformMeta(k).color }}
                  onPointerMove={(e) =>
                    tip.show(e, (
                      <>
                        {platformMeta(k).name}: <b className="dash-num">{n}</b> ({Math.round((n / total) * 100)}%)
                      </>
                    ))
                  }
                  onPointerLeave={tip.hide}
                />
              ))}
        </div>
      )}
      <ul className={`grid gap-x-4 gap-y-0.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {entries.map(([k, n]) => {
          const meta = platformMeta(k);
          return (
            <li
              key={k}
              className="dash-row flex items-center gap-2 px-1.5 py-1 -mx-1.5 text-[13px]"
              style={{ opacity: n ? 1 : 0.45 }}
            >
              <i aria-hidden="true" className="w-[3px] h-3.5 rounded-full flex-none" style={{ background: meta.color }} />
              <PlatformLogo platform={k} size={14} />
              <span className="text-[color:var(--dash-content-secondary)] truncate">{meta.name}</span>
              <b className="dash-num ml-auto font-semibold text-[color:var(--dash-content-primary)]">{n}</b>
            </li>
          );
        })}
      </ul>
      {tip.node}
    </div>
  );
}

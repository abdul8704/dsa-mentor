"use client";

import type { PlatformStat } from "@/app/lib/types/analytics";
import Card, { EmptyState } from "./ui/Card";
import { PLATFORM_ORDER, PlatformLogo, platformMeta } from "./ui/platforms";
import { useChartTip } from "./ui/interaction";

/**
 * One row per platform: solved count, then a bullet bar of current rating with
 * a tick at the peak. Unrated judges (CSES) show the solve count only.
 */
export default function PlatformRatings({ platforms }: { platforms?: PlatformStat[] | null }) {
  const tip = useChartTip();
  const list = [...(platforms ?? [])].sort(
    (a, b) =>
      (PLATFORM_ORDER.indexOf(a.platform.toLowerCase() as never) + 100) % 100 -
      ((PLATFORM_ORDER.indexOf(b.platform.toLowerCase() as never) + 100) % 100)
  );
  const scale = Math.max(...list.map((p) => Math.max(p.maxRating ?? 0, p.rating ?? 0)), 1) * 1.15;

  return (
    <Card title="Platforms" hint="solved · rating vs peak">
      {list.length === 0 ? (
        <EmptyState icon="hub" title="No platforms connected" hint="Add your handles in Settings to start tracking." />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => {
            const meta = platformMeta(p.platform);
            const rated = (p.rating ?? 0) > 0;
            const peak = Math.max(p.maxRating ?? 0, p.rating ?? 0);
            return (
              <li
                key={p.platform}
                className="rounded-[var(--dash-r-md)] p-3 flex flex-col gap-2 bg-[color:var(--dash-surface-sunken)] border border-transparent transition-[transform,border-color] duration-[var(--dash-dur-base)] hover:-translate-y-0.5 hover:border-[color:var(--dash-border-strong)]"
              >
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={p.platform} size={16} />
                  <span className="text-[13px] font-semibold text-[color:var(--dash-content-primary)]">{meta.name}</span>
                  <span className="ml-auto flex items-baseline gap-1">
                    <b className="dash-num text-[15px] font-semibold text-[color:var(--dash-content-primary)]">{p.solvedCount ?? 0}</b>
                    <span className="text-[11px] text-[color:var(--dash-content-tertiary)]">solved</span>
                  </span>
                </div>
                {rated ? (
                  <>
                    <div
                      className="relative h-2 rounded-full bg-[color:var(--dash-surface-hover)]"
                      role="img"
                      aria-label={`Rating ${p.rating}, peak ${peak}`}
                      onPointerMove={(e) => tip.show(e, <>Rating <b className="dash-num">{p.rating}</b> · peak <b className="dash-num">{peak}</b></>)}
                      onPointerLeave={tip.hide}
                    >
                      <i
                        className="absolute inset-y-0 left-0 rounded-full dash-anim-grow-x"
                        style={{ width: `${(p.rating / scale) * 100}%`, background: meta.color }}
                      />
                      <u
                        className="absolute -top-1 -bottom-1 w-[2px] rounded bg-[color:var(--dash-content-primary)]"
                        style={{ left: `${(peak / scale) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[color:var(--dash-content-tertiary)]">
                      <span>
                        Rating <b className="dash-num text-[color:var(--dash-content-secondary)]">{p.rating}</b>
                      </span>
                      <span className="dash-num">peak {peak}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[color:var(--dash-content-tertiary)]">Unrated judge. Solve count only.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tip.node}
    </Card>
  );
}

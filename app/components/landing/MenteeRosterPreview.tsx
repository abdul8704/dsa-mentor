import Last7DaysChart from "@/app/dashboard/components/Last7DaysChart";
import { DEMO_MENTEES } from "./demoData";

/** Static look at the mentor's roster, built from sample mentees. */
export default function MenteeRosterPreview() {
  return (
    <div className="dash-card !p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5">
        <h3 className="dash-card-title">All mentees</h3>
        <span className="dash-card-hint">4 in “ICPC prep”</span>
        <span className="dash-chip dash-chip-bad ml-auto">1 inactive</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px] mt-3">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--dash-content-tertiary)]">
              <th className="font-semibold px-5 py-2">Mentee</th>
              <th className="font-semibold px-3 py-2 text-right">Streak</th>
              <th className="font-semibold px-3 py-2 w-[150px]">Last 7 days</th>
              <th className="font-semibold px-3 py-2">Tasks</th>
              <th className="font-semibold px-5 py-2 text-right">Last active</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_MENTEES.map((m) => (
              <tr key={m.name} className="border-t border-[color:var(--dash-border-subtle)] transition-colors hover:bg-[color:var(--dash-surface-sunken)]">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid place-items-center w-8 h-8 rounded-full text-[11px] font-bold text-[color:var(--dash-content-on-accent)]"
                      style={{ background: m.inactive ? "var(--dash-surface-hover)" : "var(--dash-grad-accent)", color: m.inactive ? "var(--dash-content-tertiary)" : undefined }}
                      aria-hidden="true"
                    >
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[color:var(--dash-content-primary)]">{m.name}</div>
                      <div className="text-[11px] text-[color:var(--dash-content-tertiary)]">{m.tags.join(" · ")}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="dash-num font-semibold" style={{ color: m.streak ? "var(--dash-feedback-warning)" : "var(--dash-content-tertiary)" }}>
                    {m.streak}d
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="h-[46px]">
                    <Last7DaysChart breakdown={m.week} />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="dash-meter w-16">
                      <i style={{ width: `${(m.tasksDone / m.tasksTotal) * 100}%` }} />
                    </div>
                    <span className="dash-num text-[12px] text-[color:var(--dash-content-secondary)]">
                      {m.tasksDone}/{m.tasksTotal}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  {m.inactive ? (
                    <span className="dash-chip dash-chip-bad">{m.lastActive}</span>
                  ) : (
                    <span className="text-[color:var(--dash-content-secondary)]">{m.lastActive}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

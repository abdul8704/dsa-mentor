import type { AssignmentInsights } from "@/app/lib/types/mentorship";

/**
 * Mentor-only rollup of a mentee's assigned-task performance. Rendered as a
 * single full-width row at the very end of the mentee detail page. "Completed"
 * is verified against the mentee's actual solve history, not the assignment's
 * `status` field, so a manually-marked task that was never actually solved
 * doesn't inflate the count.
 */
export default function AssignmentInsightsCard({ insights }: { insights: AssignmentInsights }) {
    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-[20px] text-[#ffb59d]">insights</span>
                <h2 className="text-[18px] font-semibold text-[#e5e1e4]">Assignment performance</h2>
                <span className="text-[11px] text-[#dfc0b6] opacity-60 ml-1">(mentor only)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                    icon="assignment"
                    label="Total assigned"
                    value={insights.totalAssigned}
                    accent="#e5e1e4"
                />
                <Stat
                    icon="check_circle"
                    label="Completed (verified)"
                    value={insights.completedVerified}
                    accent="#4edea3"
                />
                <Stat
                    icon="pending_actions"
                    label="Left unsolved"
                    value={insights.unsolved}
                    accent="#ffb59d"
                />
                <Stat
                    icon="trending_up"
                    label="Avg solved / day"
                    value={insights.avgSolvedPerDay}
                    accent="#c8acff"
                />
            </div>
        </div>
    );
}

function Stat({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
    return (
        <div className="bg-white/5 rounded-xl px-5 py-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
                <span className="material-symbols-outlined text-xl" style={{ color: accent }}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col min-w-0">
                <span
                    className="text-[11px] tracking-widest font-medium uppercase text-[#a78b82] leading-tight"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                    {label}
                </span>
                <span
                    className="text-2xl font-bold leading-none tracking-tight mt-1"
                    style={{ fontFamily: "var(--font-geist-sans)", color: accent }}
                >
                    {value}
                </span>
            </div>
        </div>
    );
}

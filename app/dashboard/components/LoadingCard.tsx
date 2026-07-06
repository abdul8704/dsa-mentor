/**
 * Shared loading state UI — a glass card with a spinning ring and short copy.
 * Used for route-transition loading (`app/dashboard/loading.tsx`) and for
 * in-modal async actions (e.g. sending an invite) that should block input
 * until the request resolves.
 */
export default function LoadingCard({
    title = "Loading…",
    subtitle,
    size = "md",
}: {
    title?: string;
    subtitle?: string;
    size?: "md" | "sm";
}) {
    return (
        <div
            className={`glass-card rounded-2xl flex flex-col items-center text-center gap-4 animate-[dashboard-fade-in_0.25s_ease] ${
                size === "sm" ? "px-6 py-6 gap-3" : "px-10 py-9"
            }`}
        >
            <div className={`dashboard-loading-spinner ${size === "sm" ? "dashboard-loading-spinner--sm" : ""}`} />
            <div>
                <p className={`font-semibold text-[#e5e1e4] ${size === "sm" ? "text-[14px]" : "text-[16px]"}`}>{title}</p>
                {subtitle && <p className="text-[12px] text-[#dfc0b6] opacity-70 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}

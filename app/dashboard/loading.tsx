import LoadingCard from "./components/LoadingCard";

/**
 * Next.js App Router shows this automatically the instant a user navigates
 * to any `/dashboard/*` route that doesn't define its own `loading.tsx`,
 * while the destination page's server component fetches data.
 */
export default function DashboardLoading() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <LoadingCard title="Loading…" subtitle="Fetching the latest data" />
        </div>
    );
}

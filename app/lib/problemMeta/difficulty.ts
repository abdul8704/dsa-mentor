import "server-only";

export const difficultyMap = (platform: string, rating: number): string => {
    if (platform === "codeforces") {
        if (rating <= 1300) return "easy";
        else if (rating >= 1301 && rating <= 1600) return "medium";
        else if (rating >= 1601 && rating <= 1900) return "hard";
        else return "very hard";
    } else if (platform === "atcoder") {
        if (rating <= 299) return "easy";
        else if (rating >= 300 && rating <= 499) return "medium";
        else if (rating >= 500 && rating <= 799) return "hard";
        else return "very hard";
    } else if (platform === "cses") {
        // CSES has no numeric problem rating; `rating` here is the global
        // solve rate (solvedBy / attemptedBy * 100) computed by the caller
        // (app/lib/problemMeta/resolve.ts) — mirrors the worker's
        // utils/difficulty.ts exactly (see CSES_INTEGRATION_PLAN.md §6 on
        // why this is a different scale than Codeforces' rating buckets).
        if (rating >= 75) return "easy";
        else if (rating >= 45) return "medium";
        else return "hard";
    }
    return "unknown";
};

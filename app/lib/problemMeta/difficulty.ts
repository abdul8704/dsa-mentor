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
    }
    return "unknown";
};

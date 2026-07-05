"use client";

import { useCallback, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface ProblemsFilterBarProps {
  topics: string[];
}

const PLATFORM_OPTIONS = ["leetcode", "codeforces", "atcoder"];
const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

const FIELD_LABEL_CLASS =
  "text-[11px] uppercase tracking-[0.05em] text-[#a78b82]";
const INPUT_CLASS =
  "w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-[#e5e1e4] placeholder:text-[#6f645d] focus:outline-none focus:border-[rgba(255,181,157,0.5)] focus:ring-2 focus:ring-[rgba(255,181,157,0.15)] transition-colors [color-scheme:dark]";

/**
 * The filter form itself — no toggle button or outer card, since it's
 * rendered inline inside `RecentProblemsTable`'s own card once the header's
 * filter icon is toggled open.
 */
export default function ProblemsFilterBar({ topics }: ProblemsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState<string>(searchParams.get("search") ?? "");
  const [platform, setPlatform] = useState<string>(searchParams.get("platform") ?? "");
  const [difficulty, setDifficulty] = useState<string>(searchParams.get("difficulty") ?? "");
  const [topic, setTopic] = useState<string>(searchParams.get("topic") ?? "");
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("dateTo") ?? "");

  const activeFilterCount: number = [search, platform, difficulty, topic, dateFrom, dateTo].filter(
    (v) => v.length > 0
  ).length;

  const applyFilters = useCallback(() => {
    const next = new URLSearchParams();
    const values: Record<string, string> = { search, platform, difficulty, topic, dateFrom, dateTo };

    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });

    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }, [search, platform, difficulty, topic, dateFrom, dateTo, pathname, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applyFilters();
  }

  function handleClear(): void {
    setSearch("");
    setPlatform("");
    setDifficulty("");
    setTopic("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  }

  return (
    <div className="border-t border-white/5 pt-5 mb-6">
      {activeFilterCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-[12px] text-[#a78b82] hover:text-[#ffb4ab] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
              close
            </span>
            Clear all filters
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="filter-search" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Problem Name
          </label>
          <input
            id="filter-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-platform" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Platform
          </label>
          <select
            id="filter-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={`${INPUT_CLASS} capitalize`}
          >
            <option value="">All Platforms</option>
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-difficulty" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Difficulty
          </label>
          <select
            id="filter-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={`${INPUT_CLASS} capitalize`}
          >
            <option value="">All Difficulties</option>
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-topic" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Topic
          </label>
          <select
            id="filter-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={INPUT_CLASS}
            disabled={topics.length === 0}
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-date-from" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Solved From
          </label>
          <input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-date-to" className={FIELD_LABEL_CLASS} style={{ fontFamily: "var(--font-geist-mono)" }}>
            Solved To
          </label>
          <input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className={INPUT_CLASS}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f47144] text-[#5d1800] text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              search
            </span>
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  );
}

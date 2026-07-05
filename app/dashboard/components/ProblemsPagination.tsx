"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface ProblemsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

function PageNumberLink({ page, href, isActive }: { page: number; href: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-semibold transition-all ${
        isActive ? "bg-[#f47144] text-[#5d1800]" : "text-[#dfc0b6] hover:bg-white/5"
      }`}
      style={{ fontFamily: "var(--font-geist-mono)" }}
    >
      {page}
    </Link>
  );
}

function PageArrowLink({ href, disabled, label, icon }: { href?: string; disabled: boolean; label: string; icon: string }) {
  if (disabled || !href) {
    return (
      <span
        aria-label={label}
        aria-disabled="true"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#4a4348] cursor-not-allowed"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          {icon}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#dfc0b6] hover:bg-white/5 transition-colors"
    >
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
        {icon}
      </span>
    </Link>
  );
}

export default function ProblemsPagination({ currentPage, totalPages, totalCount, pageSize }: ProblemsPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalCount === 0) {
    return null;
  }

  function hrefForPage(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }

  const startItem: number = (currentPage - 1) * pageSize + 1;
  const endItem: number = Math.min(currentPage * pageSize, totalCount);
  const canGoPrev: boolean = currentPage > 1;
  const canGoNext: boolean = currentPage < totalPages;

  const WINDOW = 1;
  const pageNumbers: number[] = [];
  for (let p = Math.max(1, currentPage - WINDOW); p <= Math.min(totalPages, currentPage + WINDOW); p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="glass-card rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
      <span className="text-[12px] text-[#a78b82]" style={{ fontFamily: "var(--font-geist-mono)" }}>
        Showing {startItem}–{endItem} of {totalCount}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PageArrowLink href={canGoPrev ? hrefForPage(currentPage - 1) : undefined} disabled={!canGoPrev} label="Previous page" icon="chevron_left" />

          {pageNumbers[0] > 1 && (
            <>
              <PageNumberLink page={1} href={hrefForPage(1)} isActive={currentPage === 1} />
              {pageNumbers[0] > 2 && <span className="px-1 text-[#a78b82]">…</span>}
            </>
          )}

          {pageNumbers.map((p) => (
            <PageNumberLink key={p} page={p} href={hrefForPage(p)} isActive={p === currentPage} />
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-[#a78b82]">…</span>}
              <PageNumberLink page={totalPages} href={hrefForPage(totalPages)} isActive={currentPage === totalPages} />
            </>
          )}

          <PageArrowLink href={canGoNext ? hrefForPage(currentPage + 1) : undefined} disabled={!canGoNext} label="Next page" icon="chevron_right" />
        </div>
      )}
    </div>
  );
}

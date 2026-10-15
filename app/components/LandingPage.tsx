import Link from "next/link";
import type { ReactNode } from "react";
import Last7DaysCard from "../dashboard/components/Last7DaysCard";
import DifficultyByPlatform from "../dashboard/components/DifficultyByPlatform";
import Heatmap from "../dashboard/components/Heatmap";
import { PlatformLogo, PLATFORM_ORDER, platformMeta } from "../dashboard/components/ui/platforms";
import MenteeRosterPreview from "./landing/MenteeRosterPreview";
import { DEMO_DIFFICULTY, DEMO_STREAK, demoHeatmap } from "./landing/demoData";
import Logo from "./brand/Logo";

const LEARNER_FEATURES = [
  {
    icon: "sync",
    title: "Every platform, one profile",
    copy: "Connect LeetCode, Codeforces, AtCoder and CSES once. Solves, ratings and contests sync on their own.",
  },
  {
    icon: "local_fire_department",
    title: "Streaks that count everywhere",
    copy: "A solve on any platform keeps your streak alive. See your week, your year and your best day at a glance.",
  },
  {
    icon: "donut_large",
    title: "Know your difficulty mix",
    copy: "Easy, medium and hard split per platform, so you notice when you've been playing it safe.",
  },
  {
    icon: "category",
    title: "Find weak topics",
    copy: "Topic breakdowns for all time and the last 7 days show what you practise and what you avoid.",
  },
  {
    icon: "show_chart",
    title: "Contest rating history",
    copy: "Rating graphs per platform, peak and percentile, plus upcoming contests and the ones you attended.",
  },
  {
    icon: "flag",
    title: "Goals and revision",
    copy: "Set targets, track them against real solves, and get problems worth revisiting resurfaced.",
  },
];

const MENTOR_FEATURES = [
  {
    icon: "group_add",
    title: "Invite and group mentees",
    copy: "Send an invite, they accept, and their progress appears in your roster. Organise cohorts into groups.",
  },
  {
    icon: "monitoring",
    title: "Spot who's slipping",
    copy: "Streaks, 7-day activity and last-active dates side by side. Inactive mentees are flagged for you.",
  },
  {
    icon: "assignment",
    title: "Assign problems that verify themselves",
    copy: "Assign a problem to one mentee or a whole group. Completion is checked against their real solve history.",
  },
  {
    icon: "sticky_note_2",
    title: "Notes and full dashboards",
    copy: "Leave notes for a mentee or group, and open any mentee's complete dashboard with one click.",
  },
];

const STEPS = [
  { title: "Create an account", copy: "Sign up with your email. It takes under a minute." },
  { title: "Add your handles", copy: "Type your usernames. We verify them and import your history in the background." },
  { title: "Practise as usual", copy: "Keep solving where you already do. Your dashboard updates itself." },
];

const FAQ = [
  {
    q: "Which platforms are supported?",
    a: "LeetCode, Codeforces, AtCoder and CSES. CSES has no public API, so you connect it with your session or password from Settings.",
  },
  {
    q: "How long does the first import take?",
    a: "Handles are verified straight away. Your full history imports in the background and usually shows up within a few minutes.",
  },
  {
    q: "Is my profile public?",
    a: "No. Your dashboard is private unless you turn on a public profile in Settings, and you choose which sections it shows.",
  },
  {
    q: "How does mentoring work?",
    a: "A mentor searches for you and sends an invite. Once you accept, they can see your progress, assign problems and leave notes.",
  },
];

function SectionHead({ eyebrow, title, copy, id }: { eyebrow: string; title: ReactNode; copy?: string; id?: string }) {
  return (
    <div className="flex flex-col gap-3 max-w-[640px]">
      <span className="dash-chip dash-chip-accent self-start">{eyebrow}</span>
      <h2 id={id} className="text-[clamp(1.6rem,3.2vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.02em]">
        {title}
      </h2>
      {copy && <p className="text-[15px] leading-relaxed text-[color:var(--dash-content-secondary)]">{copy}</p>}
    </div>
  );
}

function FeatureTile({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <article className="dash-card group h-full">
      <span
        className="grid place-items-center w-10 h-10 rounded-[var(--dash-r-md)] bg-[color:var(--dash-accent-wash)] text-[color:var(--dash-accent-soft)] transition-transform duration-[var(--dash-dur-base)] group-hover:-translate-y-0.5 group-hover:scale-105"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <h3 className="text-[15px] font-bold text-[color:var(--dash-content-primary)]">{title}</h3>
      <p className="text-[13px] leading-relaxed text-[color:var(--dash-content-secondary)]">{copy}</p>
    </article>
  );
}

/** A window frame around a live preview so it reads as "the product". */
function ProductFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative rounded-[18px] border border-[color:var(--dash-border-strong)] bg-[color:var(--dash-surface-base)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-10 border-b border-[color:var(--dash-border-subtle)] bg-[color:var(--dash-surface-raised)]">
        <i className="w-2.5 h-2.5 rounded-full bg-[#f2615f]/80" aria-hidden="true" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#f2b441]/80" aria-hidden="true" />
        <i className="w-2.5 h-2.5 rounded-full bg-[#2fc48d]/80" aria-hidden="true" />
        <span className="ml-3 text-[11px] text-[color:var(--dash-content-tertiary)] truncate">{label}</span>
        <span className="dash-chip dash-chip-idle ml-auto">Sample data</span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  const heatmap = demoHeatmap();

  return (
    <div className="dashboard-shell relative overflow-x-clip">
      {/* Ambient glow behind the hero */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" style={{ background: "var(--dash-grad-hero)" }} />

      <header className="sticky top-0 z-50 border-b border-[color:var(--dash-border-subtle)] bg-[color:var(--dash-surface-base)]/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 h-16 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={32} glow textSize={15} />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-[13px] font-semibold text-[color:var(--dash-content-secondary)]" aria-label="Sections">
            {[
              ["#learners", "For learners"],
              ["#mentors", "For mentors"],
              ["#how", "How it works"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="px-3 py-2 rounded-[var(--dash-r-sm)] transition-colors hover:text-[color:var(--dash-content-primary)] hover:bg-[color:var(--dash-surface-sunken)]">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth" className="dash-btn dash-btn-sm text-[color:var(--dash-content-secondary)] hover:text-[color:var(--dash-content-primary)]">
              Log in
            </Link>
            <Link href="/auth" className="dash-btn dash-btn-primary dash-btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-[1200px] px-4 md:px-6 pt-14 md:pt-20 pb-10 flex flex-col items-center text-center gap-6">
          <span className="dash-chip dash-chip-accent dash-anim-rise">For competitive programmers and the people who coach them</span>
          <h1 className="dash-anim-rise max-w-[880px] text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.035em]" style={{ animationDelay: "60ms" }}>
            All your DSA progress,{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--dash-grad-accent)" }}>
              one dashboard
            </span>
          </h1>
          <p className="dash-anim-rise max-w-[620px] text-[clamp(1rem,1.6vw,1.125rem)] leading-relaxed text-[color:var(--dash-content-secondary)]" style={{ animationDelay: "120ms" }}>
            AlgoMentor pulls your solves, streaks, ratings and contests from every judge you use into one place, so you can see
            what you&apos;ve done and what to practise next. Mentors get a live view of every student.
          </p>
          <div className="dash-anim-rise flex flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <Link href="/auth" className="dash-btn dash-btn-primary !min-h-[48px] !px-6 !text-[15px]">
              Start tracking for free
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <a href="#preview" className="dash-btn dash-btn-ghost !min-h-[48px] !px-6 !text-[15px]">
              See it in action
            </a>
          </div>
          <div className="dash-anim-rise flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-[color:var(--dash-content-tertiary)]" style={{ animationDelay: "240ms" }}>
            <span>Syncs with</span>
            {PLATFORM_ORDER.map((p) => (
              <span key={p} className="inline-flex items-center gap-2 font-semibold text-[color:var(--dash-content-secondary)]">
                <PlatformLogo platform={p} size={18} />
                {platformMeta(p).name}
              </span>
            ))}
          </div>

          {/* Audience picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[720px] mt-4 text-left">
            {[
              { href: "#learners", icon: "school", title: "I practise problems", copy: "Track streaks, weak topics and ratings across platforms." },
              { href: "#mentors", icon: "supervisor_account", title: "I mentor students", copy: "Watch a whole cohort, assign problems, catch drop-offs early." },
            ].map((a) => (
              <a key={a.href} href={a.href} className="dash-card dash-spot group !flex-row items-center !gap-4 hover:-translate-y-0.5">
                <span className="grid place-items-center w-11 h-11 flex-none rounded-[var(--dash-r-md)] bg-[color:var(--dash-surface-sunken)] text-[color:var(--dash-accent-soft)]" aria-hidden="true">
                  <span className="material-symbols-outlined">{a.icon}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold text-[color:var(--dash-content-primary)]">{a.title}</span>
                  <span className="block text-[12px] text-[color:var(--dash-content-tertiary)]">{a.copy}</span>
                </span>
                <span className="material-symbols-outlined text-[color:var(--dash-content-tertiary)] transition-transform duration-[var(--dash-dur-base)] group-hover:translate-x-1 group-hover:text-[color:var(--dash-accent-soft)]" aria-hidden="true">
                  arrow_downward
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Live product preview ── */}
        <section id="preview" aria-label="Dashboard preview" className="mx-auto max-w-[1200px] px-4 md:px-6 pb-20 scroll-mt-20">
          <ProductFrame label="Your dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 flex flex-col [&>*]:flex-1">
                <Last7DaysCard streak={DEMO_STREAK} />
              </div>
              <div className="lg:col-span-7 flex flex-col [&>*]:flex-1">
                <DifficultyByPlatform difficulty={DEMO_DIFFICULTY} />
              </div>
              <div className="lg:col-span-12 hidden md:block">
                <Heatmap data={heatmap} />
              </div>
            </div>
          </ProductFrame>
          <p className="mt-4 text-center text-[13px] text-[color:var(--dash-content-tertiary)]">
            This is the real dashboard running on sample data. Click a day or hover a platform to try it.
          </p>
        </section>

        {/* ── Learners ── */}
        <section id="learners" aria-labelledby="learners-title" className="mx-auto max-w-[1200px] px-4 md:px-6 py-16 md:py-20 scroll-mt-16 flex flex-col gap-10">
          <SectionHead
            id="learners-title"
            eyebrow="For learners"
            title="Stop guessing where your practice went"
            copy="Most of us solve on three or four judges and remember none of it. AlgoMentor keeps the whole picture so you can plan your next session in seconds."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEARNER_FEATURES.map((f) => (
              <FeatureTile key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── Mentors ── */}
        <section id="mentors" aria-labelledby="mentors-title" className="relative py-16 md:py-20 scroll-mt-16 border-y border-[color:var(--dash-border-subtle)] bg-[color:var(--dash-surface-raised)]/40">
          <div className="mx-auto max-w-[1200px] px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center">
            <div className="flex flex-col gap-8">
              <SectionHead
                id="mentors-title"
                eyebrow="For mentors"
                title="Coach a whole cohort without chasing screenshots"
                copy="See every mentee's activity in one roster, hand out problems, and know who needs a nudge before they fall behind."
              />
              <ul className="flex flex-col gap-4">
                {MENTOR_FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <span className="grid place-items-center w-9 h-9 flex-none rounded-[var(--dash-r-md)] bg-[color:var(--dash-accent-wash)] text-[color:var(--dash-accent-soft)]" aria-hidden="true">
                      <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                    </span>
                    <div>
                      <h3 className="text-[14px] font-bold text-[color:var(--dash-content-primary)]">{f.title}</h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--dash-content-secondary)]">{f.copy}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <ProductFrame label="Mentees">
              <MenteeRosterPreview />
            </ProductFrame>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-[1200px] px-4 md:px-6 py-16 md:py-20 scroll-mt-16 flex flex-col gap-10">
          <SectionHead id="how-title" eyebrow="How it works" title="Set up once, then forget about it" />
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="dash-card relative overflow-hidden">
                <span className="dash-num text-[44px] font-semibold leading-none bg-clip-text text-transparent" style={{ backgroundImage: "var(--dash-grad-accent)" }} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[15px] font-bold text-[color:var(--dash-content-primary)]">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-[color:var(--dash-content-secondary)]">{s.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[840px] px-4 md:px-6 pb-16 md:pb-20 scroll-mt-16 flex flex-col gap-8">
          <SectionHead id="faq-title" eyebrow="FAQ" title="Questions people ask first" />
          <div className="flex flex-col gap-2">
            {FAQ.map((f) => (
              <details key={f.q} className="dash-card !p-0 group">
                <summary className="flex items-center gap-3 px-5 min-h-[56px] cursor-pointer list-none text-[14px] font-semibold text-[color:var(--dash-content-primary)] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="material-symbols-outlined ml-auto text-[color:var(--dash-content-tertiary)] transition-transform duration-[var(--dash-dur-base)] group-open:rotate-45" aria-hidden="true">
                    add
                  </span>
                </summary>
                <p className="px-5 pb-5 -mt-1 text-[13px] leading-relaxed text-[color:var(--dash-content-secondary)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-[1200px] px-4 md:px-6 pb-20">
          <div className="dash-card dash-hero items-center text-center !py-14 !px-6">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold tracking-[-0.02em] leading-tight max-w-[640px]">
              See your progress in one place by tonight
            </h2>
            <p className="text-[15px] text-[color:var(--dash-content-secondary)] max-w-[520px]">
              Create an account, add your handles, and your dashboard fills itself in.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <Link href="/auth" className="dash-btn dash-btn-primary !min-h-[48px] !px-6 !text-[15px]">
                Create your account
              </Link>
              <Link href="/auth" className="dash-btn dash-btn-ghost !min-h-[48px] !px-6 !text-[15px]">
                I already have one
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--dash-border-subtle)]">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center gap-3 text-[13px] text-[color:var(--dash-content-tertiary)]">
          <Logo size={24} textSize={14} />
          <span>Track progress. Build streaks. Close topic gaps.</span>
        </div>
      </footer>
    </div>
  );
}

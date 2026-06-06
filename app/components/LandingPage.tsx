import Link from "next/link";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";

const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const PROBLEMS = [
  {
    icon: "hub",
    title: "Progress is scattered",
    copy: "You solve problems on LeetCode, Codeforces, and AtCoder, but each platform keeps its own siloed stats.",
  },
  {
    icon: "trending_down",
    title: "Consistency is invisible",
    copy: "Streaks, daily effort, and long-term momentum are hard to see when your data lives in different places.",
  },
  {
    icon: "pie_chart",
    title: "Weak topics stay hidden",
    copy: "Without a unified view of difficulty and topic breakdowns, it is tough to know what to practice next.",
  },
];

const FEATURES = [
  {
    icon: "sync",
    title: "Unified platform sync",
    copy: "Connect your handles once and pull solved counts, ratings, and contest history into one profile.",
  },
  {
    icon: "local_fire_department",
    title: "Streaks & activity",
    copy: "Track daily solves, weekly trends, heatmaps, and streak milestones to stay accountable.",
  },
  {
    icon: "insights",
    title: "Actionable analytics",
    copy: "See difficulty splits, contest rating graphs, and topic breakdowns that guide your next study session.",
  },
  {
    icon: "school",
    title: "Built for mentorship",
    copy: "AlgoMentor gives mentors and learners a shared picture of progress, not just isolated platform stats.",
  },
];

const STEPS = [
  { step: "01", title: "Create your account", copy: "Sign up and verify your email to get started." },
  { step: "02", title: "Connect your platforms", copy: "Add handles for LeetCode, Codeforces, AtCoder, and more." },
  { step: "03", title: "Open your dashboard", copy: "Watch your progress, streaks, and topic gaps come together." },
];

export default function LandingPage() {
  return (
    <div className={`landing-shell ${bodyFont.className}`}>
      <div className="landing-grid" aria-hidden />
      <div className="landing-spot landing-spot-left" aria-hidden />
      <div className="landing-spot landing-spot-right" aria-hidden />

      <header className="landing-header">
        <Link href="/" className={`landing-logo ${headingFont.className}`}>
          AlgoMentor
        </Link>
        <nav className="landing-nav">
          <a href="#features" className="landing-nav-link">
            Features
          </a>
          <a href="#how-it-works" className="landing-nav-link">
            How it works
          </a>
          <Link href="/auth" className="landing-nav-link">
            Log in
          </Link>
          <Link href="/auth" className="landing-btn landing-btn-primary landing-btn-sm">
            Sign up
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <p className="landing-kicker">DSA progress, finally in one place</p>
          <h1 className={`landing-title ${headingFont.className}`}>
            Track your competitive programming journey with clarity
          </h1>
          <p className="landing-lead">
            AlgoMentor unifies your solves, streaks, contest ratings, and topic analytics across
            coding platforms — so you always know where you stand and what to improve next.
          </p>
          <div className="landing-hero-actions">
            <Link href="/auth" className="landing-btn landing-btn-primary">
              Get started free
            </Link>
            <Link href="/dashboard" className="landing-btn landing-btn-secondary">
              View dashboard
            </Link>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <span className="landing-stat-value">3+</span>
              <span className="landing-stat-label">Platforms synced</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">7-day</span>
              <span className="landing-stat-label">Activity trends</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">Topic</span>
              <span className="landing-stat-label">Gap analysis</span>
            </div>
          </div>
        </section>

        <section className="landing-section landing-problems">
          <div className="landing-section-head">
            <p className="landing-kicker">The problem</p>
            <h2 className={`landing-section-title ${headingFont.className}`}>
              DSA prep should not feel fragmented
            </h2>
            <p className="landing-section-copy">
              Most learners juggle multiple judge platforms, spreadsheets, and memory. AlgoMentor
              exists to replace that friction with one focused workspace.
            </p>
          </div>
          <div className="landing-problem-grid">
            {PROBLEMS.map((item) => (
              <article key={item.title} className="landing-problem-card">
                <span className="material-symbols-outlined landing-card-icon">{item.icon}</span>
                <h3 className={`landing-card-title ${headingFont.className}`}>{item.title}</h3>
                <p className="landing-card-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="landing-section landing-features">
          <div className="landing-section-head">
            <p className="landing-kicker">What it does</p>
            <h2 className={`landing-section-title ${headingFont.className}`}>
              Everything you need to measure real progress
            </h2>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((item) => (
              <article key={item.title} className="landing-feature-card">
                <span className="material-symbols-outlined landing-feature-icon">{item.icon}</span>
                <h3 className={`landing-card-title ${headingFont.className}`}>{item.title}</h3>
                <p className="landing-card-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-steps">
          <div className="landing-section-head">
            <p className="landing-kicker">How it works</p>
            <h2 className={`landing-section-title ${headingFont.className}`}>
              From sign-up to insights in minutes
            </h2>
          </div>
          <div className="landing-step-grid">
            {STEPS.map((item) => (
              <article key={item.step} className="landing-step-card">
                <span className="landing-step-number">{item.step}</span>
                <h3 className={`landing-card-title ${headingFont.className}`}>{item.title}</h3>
                <p className="landing-card-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-cta-card">
            <h2 className={`landing-cta-title ${headingFont.className}`}>
              Ready to make your DSA progress visible?
            </h2>
            <p className="landing-cta-copy">
              Create an account to start tracking, or jump straight into the dashboard demo.
            </p>
            <div className="landing-hero-actions">
              <Link href="/auth" className="landing-btn landing-btn-primary">
                Log in / Sign up
              </Link>
              <Link href="/dashboard" className="landing-btn landing-btn-ghost">
                Go to dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p className="landing-footer-brand">AlgoMentor</p>
        <p className="landing-footer-copy">Track progress. Build streaks. Close topic gaps.</p>
      </footer>
    </div>
  );
}

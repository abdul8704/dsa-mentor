/**
 * AlgoMentor brand mark: an "A" drawn as a small tree. The top node (mentor)
 * branches to two nodes below (learners), and the crossbar ties them together,
 * so it reads as a letter, a data structure and a mentoring link at once.
 *
 * Keep in sync with app/icon.svg (favicon) and public/logo.svg.
 */
const GRADIENT = "linear-gradient(135deg, #1fb57f 0%, #3fdc9e 55%, #7cf0c4 100%)";

export function LogoGlyph({ size = 20, color = "#06120c" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5.2 5.6 18.6M12 5.2l6.4 13.4M8.1 13.4h7.8" stroke={color} strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="12" cy="4.6" r="2.9" fill={color} />
      <circle cx="5.4" cy="18.9" r="2.4" fill={color} />
      <circle cx="18.6" cy="18.9" r="2.4" fill={color} />
    </svg>
  );
}

export function LogoMark({ size = 32, glow = false, className = "" }: { size?: number; glow?: boolean; className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center flex-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: GRADIENT,
        boxShadow: glow ? "0 6px 20px -8px rgba(47, 196, 141, 0.65)" : undefined,
      }}
      aria-hidden="true"
    >
      <LogoGlyph size={Math.round(size * 0.68)} />
    </span>
  );
}

/** Mark plus wordmark. `sub` adds a small caption under the name. */
export default function Logo({ size = 32, sub, glow, textSize = 16 }: { size?: number; sub?: string; glow?: boolean; textSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} glow={glow} />
      <span className="leading-tight">
        <span className="block font-extrabold tracking-[-0.02em] text-[color:var(--dash-content-primary,#ececee)]" style={{ fontSize: textSize }}>
          AlgoMentor
        </span>
        {sub && <span className="block text-[11px] text-[color:var(--dash-content-tertiary,#80828a)]">{sub}</span>}
      </span>
    </span>
  );
}

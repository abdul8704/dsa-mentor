export default function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" aria-hidden="true">
      <div className="absolute top-[-15%] right-[-10%] w-[620px] h-[620px] bg-[rgba(47,196,141,0.07)] blur-[160px] rounded-full" />
      <div className="absolute bottom-[-15%] left-[10%] w-[460px] h-[460px] bg-[rgba(57,135,229,0.06)] blur-[140px] rounded-full" />
    </div>
  );
}

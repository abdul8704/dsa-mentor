export default function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[rgba(255,181,157,0.1)] blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[rgba(78,222,163,0.05)] blur-[120px] rounded-full" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-[rgba(93,24,0,0.05)] blur-[100px] rounded-full" />
    </div>
  );
}

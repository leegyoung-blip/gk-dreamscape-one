export function ProgressRing({
  value,
  size = 76,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full p-[5px]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(rgb(34 211 238) ${safeValue * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
      }}
      aria-label={`${label ?? "Progress"}: ${safeValue}%`}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-slate-950/95 text-center">
        <div>
          <div className="text-base font-black text-white">{safeValue}%</div>
          {label ? <div className="text-[9px] uppercase tracking-wider text-slate-400">{label}</div> : null}
        </div>
      </div>
    </div>
  );
}

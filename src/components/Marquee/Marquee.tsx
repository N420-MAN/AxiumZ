interface MarqueeProps {
  items: string[];
  tone?: "light" | "accent";
}

// Ticker band: navy strip between two gold rules, like the cover of a notebook.
export default function Marquee({ items, tone = "light" }: MarqueeProps) {
  const bg = tone === "accent" ? "bg-accent text-ink border-ink" : "bg-ink text-paper border-accent";

  // Repeat the source list enough times that one full block is wider than
  // any realistic viewport, then duplicate that block once for the loop —
  // this guarantees the -50% translation never reveals empty space.
  const block = Array(3).fill(items).flat();
  const track = [...block, ...block];

  return (
    <div className={`overflow-hidden border-y-[3px] py-3.5 ${bg}`} aria-hidden="true">
      <div className="marquee-track flex w-max items-center gap-9 whitespace-nowrap">
        {track.map((item, i) => (
          <span key={i} className="font-display flex items-center gap-9 text-[1.35rem] font-bold">
            {item}
            <span className={tone === "accent" ? "text-ink" : "text-accent-bright"}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

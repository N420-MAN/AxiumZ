interface MarqueeProps {
  items: string[];
  tone?: "light" | "accent";
}

export default function Marquee({ items, tone = "light" }: MarqueeProps) {
  const bg = tone === "accent" ? "bg-accent text-paper" : "bg-paper-soft text-ink";

  // Repeat the source list enough times that one full block is wider than
  // any realistic viewport, then duplicate that block once for the loop —
  // this guarantees the -50% translation never reveals empty space.
  // Duration is scaled to match (see .marquee-track), so playback speed
  // stays the same regardless of how many times the list repeats.
  const block = Array(3).fill(items).flat();
  const track = [...block, ...block];

  return (
    <div className={`overflow-hidden border-y border-line-light py-4 ${bg}`}>
      <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
        {track.map((item, i) => (
          <span key={i} className="font-display flex items-center gap-10 text-[1.1rem] font-extrabold">
            {item}
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
          </span>
        ))}
      </div>
    </div>
  );
}

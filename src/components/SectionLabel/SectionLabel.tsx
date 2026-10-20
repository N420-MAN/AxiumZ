interface SectionLabelProps {
  children: string;
  tone?: "light" | "dark";
  className?: string;
}

// Handwritten margin note above a title. tone "light" = on a navy section, "dark" = on paper.
export default function SectionLabel({ children, tone = "light", className = "" }: SectionLabelProps) {
  const color = tone === "light" ? "text-accent-bright" : "text-red";
  return (
    <div className={className}>
      <span className={`font-hand inline-block -rotate-2 text-[1.5rem] leading-none font-bold sm:text-[1.7rem] ${color}`}>{children}</span>
    </div>
  );
}

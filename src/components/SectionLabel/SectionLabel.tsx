interface SectionLabelProps {
  children: string;
  tone?: "light" | "dark";
  className?: string;
}

export default function SectionLabel({ children, tone = "light", className = "" }: SectionLabelProps) {
  const color = tone === "light" ? "text-mist" : "text-graphite";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-current opacity-40" aria-hidden="true" />
      <span className={`font-body text-[0.8rem] tracking-[0.08em] ${color}`}>{children}</span>
    </div>
  );
}

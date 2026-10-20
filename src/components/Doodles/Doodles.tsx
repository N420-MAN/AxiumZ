// Decorative school doodles floating on a paper section. Purely visual (aria-hidden).
// Kept in the left/right gutters and low corners so they never sit behind the navigation or the text.
type Variant = "hero" | "page";

export default function Doodles({ variant = "page" }: { variant?: Variant }) {
  const hero = variant === "hero";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="doodle font-hand hidden text-[4.5rem] font-bold lg:block" style={{ left: "1.5%", top: hero ? "22%" : "34%", ["--r" as string]: "-10deg" }}>π</span>
      <span className="doodle font-hand hidden text-[3.5rem] font-bold sm:block sm:text-[5rem]" style={{ right: "3%", top: hero ? "16%" : "30%", ["--r" as string]: "12deg", animationDelay: "-4s", color: "var(--color-red)", opacity: 0.28 }}>∑</span>
      <span className="doodle font-hand hidden text-[3rem] font-bold xl:block" style={{ right: hero ? "46%" : "22%", bottom: hero ? "7%" : "10%", ["--r" as string]: "6deg", animationDelay: "-2s" }}>E = mc²</span>
      <svg className="doodle hidden md:block" style={{ right: "4%", bottom: "8%", ["--r" as string]: "-14deg", animationDelay: "-3s", opacity: 0.9 }} width="150" height="30" viewBox="0 0 120 24">
        <rect x="0" y="4" width="84" height="16" fill="#c8962f" />
        <rect x="0" y="4" width="12" height="16" fill="#b83e3d" />
        <path d="M84 4 L112 12 L84 20 Z" fill="#f3ecdd" />
        <path d="M104 9 L112 12 L104 15 Z" fill="#0f2a5c" />
      </svg>
      <svg className="doodle hidden lg:block" style={{ left: "2.5%", bottom: "10%", animationDelay: "-5s", color: "var(--color-accent)", opacity: 0.7 }} width="46" height="46" viewBox="0 0 24 24">
        <path d="M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z" fill="currentColor" />
      </svg>
    </div>
  );
}

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

interface ButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  children: ReactNode;
  to?: string;
  href?: string;
  variant?: "solid" | "outline";
  tone?: "light" | "dark";
  className?: string;
}

export default function Button({
  children,
  to,
  href,
  variant = "solid",
  tone = "dark",
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "btn-sticker relative inline-flex items-center justify-center rounded-md px-7 py-3.5 text-[0.95rem] font-semibold tracking-[0.01em]";

  // dark = used on a navy section (paper button, gold shadow); light = used on paper (navy button, gold shadow)
  const solidColors = tone === "dark" ? "bg-paper text-ink [--sticker:var(--color-accent)]" : "bg-ink text-paper [--sticker:var(--color-accent)]";
  const outlineColors =
    tone === "dark"
      ? "border-2 border-paper/80 text-paper hover:bg-paper/10 [--sticker:rgba(251,248,242,0.25)]"
      : "border-2 border-ink text-ink hover:bg-accent-soft [--sticker:rgba(15,42,92,0.18)]";

  const content = <span className="relative">{children}</span>;

  const classes = `${base} ${variant === "solid" ? solidColors : outlineColors} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...(rest as Record<string, unknown>)}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...rest}>
      {content}
    </a>
  );
}

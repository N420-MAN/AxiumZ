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
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3.5 text-[0.95rem] font-semibold tracking-[0.01em] transition-all duration-300 active:scale-[0.97]";

  const solidColors =
    tone === "dark"
      ? "bg-paper text-ink shadow-[0_10px_28px_-10px_rgba(200,150,47,0.55)] hover:shadow-[0_14px_32px_-8px_rgba(200,150,47,0.7)] hover:-translate-y-0.5"
      : "bg-ink text-paper shadow-[0_10px_28px_-10px_rgba(15,42,92,0.55)] hover:shadow-[0_14px_32px_-8px_rgba(15,42,92,0.7)] hover:-translate-y-0.5";

  const outlineColors =
    tone === "dark"
      ? "border-2 border-paper/70 text-paper hover:border-paper hover:bg-paper/10"
      : "border-2 border-ink/40 text-ink hover:border-ink hover:bg-ink/5";

  const content =
    variant === "solid" ? (
      <>
        <span
          className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-100"
          aria-hidden="true"
        />
        <span className="relative transition-colors duration-500 group-hover:text-paper">{children}</span>
      </>
    ) : (
      <span className="relative">{children}</span>
    );

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

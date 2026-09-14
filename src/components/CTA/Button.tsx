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
    "group relative inline-flex items-center justify-center overflow-hidden px-7 py-3.5 text-[0.95rem] font-medium tracking-[0.01em] transition-colors duration-500";

  const solidColors = tone === "dark" ? "bg-paper text-ink" : "bg-ink text-paper";
  const outlineColors = tone === "dark" ? "border-paper/30 text-paper" : "border-ink/25 text-ink";

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
      <>
        <span
          className="absolute inset-0 origin-left scale-x-0 bg-current opacity-[0.06] transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-100"
          aria-hidden="true"
        />
        <span className="relative">{children}</span>
      </>
    );

  const classes = `${base} ${variant === "solid" ? solidColors : `border ${outlineColors}`} ${className}`;

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

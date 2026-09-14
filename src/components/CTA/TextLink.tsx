import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

interface TextLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  children: ReactNode;
  to?: string;
  href?: string;
  className?: string;
}

export default function TextLink({ children, to, href, className = "", ...rest }: TextLinkProps) {
  const inner = (
    <span className="relative">
      {children}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-100 bg-current transition-transform duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-0" />
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-accent transition-transform delay-100 duration-500 ease-[var(--ease-editorial)] group-hover:scale-x-100" />
    </span>
  );

  const classes = `group relative inline-flex items-center gap-2 text-[0.95rem] font-medium ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...(rest as Record<string, unknown>)}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...rest}>
      {inner}
    </a>
  );
}

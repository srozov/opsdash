import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  default: "border border-border-bright bg-surface-elevated text-text-primary hover:bg-surface-hover",
  primary: "bg-accent text-white hover:bg-accent-hover",
  danger: "border border-error/50 text-error hover:bg-error/10",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
};

export function Button({
  variant = "default",
  className = "",
  ...props
}: { variant?: keyof typeof VARIANTS } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";

type BadgeVariant = "success" | "danger" | "neutral" | "accent" | "polkadot";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  success: "badge badge--success",
  danger: "badge badge--danger",
  neutral: "badge badge--neutral",
  accent: "badge badge--accent",
  polkadot: "badge badge--polkadot"
};

export function Badge({ variant = "neutral", className = "", children, ...rest }: BadgeProps) {
  return (
    <span className={`${VARIANT_CLASS[variant]} ${className}`} {...rest}>
      {children}
    </span>
  );
}

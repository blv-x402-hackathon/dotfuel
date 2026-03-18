import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "button",
  accent: "button button--accent",
  ghost: "button button--ghost",
  danger: "button button--danger"
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "button--sm",
  md: "",
  lg: "button--lg"
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [VARIANT_CLASS[variant], SIZE_CLASS[size], className].filter(Boolean).join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <span className="button__spinner" aria-hidden /> : icon ?? null}
      {children}
    </button>
  );
}

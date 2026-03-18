interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circle" | "rect";
  className?: string;
}

export function Skeleton({ width, height = 16, variant = "text", className = "" }: SkeletonProps) {
  const borderRadius =
    variant === "circle" ? "999px" :
    variant === "text" ? "var(--radius-sm)" :
    "var(--radius-md)";

  return (
    <span
      className={`skeleton ${className}`}
      style={{
        display: "block",
        width: width ?? (variant === "circle" ? height : "100%"),
        height,
        borderRadius
      }}
      aria-hidden
    >
      <style jsx>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(78, 54, 32, 0.08) 25%,
            rgba(78, 54, 32, 0.14) 50%,
            rgba(78, 54, 32, 0.08) 75%
          );
          background-size: 200% 100%;
          animation: skeletonPulse 1.6s ease-in-out infinite;
        }

        @keyframes skeletonPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (prefers-color-scheme: dark) {
          .skeleton {
            background: linear-gradient(
              90deg,
              rgba(240, 230, 216, 0.06) 25%,
              rgba(240, 230, 216, 0.12) 50%,
              rgba(240, 230, 216, 0.06) 75%
            );
            background-size: 200% 100%;
          }
        }
      `}</style>
    </span>
  );
}

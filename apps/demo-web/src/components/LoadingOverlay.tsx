"use client";

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        color: "white",
        fontWeight: 600
      }}
    >
      Processing UserOperation...
    </div>
  );
}

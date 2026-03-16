"use client";

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-card">Processing UserOperation...</div>
    </div>
  );
}

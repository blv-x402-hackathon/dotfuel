"use client";

export type IconName =
  | "chevron-down"
  | "external-link"
  | "close"
  | "copy"
  | "check"
  | "bell"
  | "home"
  | "send"
  | "shield"
  | "clock"
  | "plus"
  | "wallet"
  | "search"
  | "warning"
  | "info"
  | "arrow-right"
  | "refresh";

export type IconSize = "sm" | "md" | "lg";

const SIZE_PX: Record<IconSize, number> = { sm: 14, md: 18, lg: 24 };

const PATHS: Record<IconName, React.ReactNode> = {
  "chevron-down": <path d="M5 8l7 7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  "external-link": <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /></>,
  "close": <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />,
  "copy": <><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /></>,
  "check": <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  "bell": <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /></>,
  "home": <><path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20V9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M9 21.5V14h6v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  "send": <><path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  "shield": <><path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  "clock": <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" /></>,
  "plus": <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />,
  "wallet": <><rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M1 10h22" stroke="currentColor" strokeWidth="1.8" fill="none" /></>,
  "search": <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" fill="none" /><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  "warning": <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  "info": <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" fill="none" /><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  "arrow-right": <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  "refresh": <><path d="M23 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
};

import React from "react";

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export function Icon({ name, size = "md", className, ...rest }: IconProps) {
  const px = SIZE_PX[size];
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      aria-label={rest["aria-label"]}
    >
      {PATHS[name]}
    </svg>
  );
}

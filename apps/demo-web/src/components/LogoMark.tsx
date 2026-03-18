import type { ComponentPropsWithoutRef } from "react";

export function LogoMark(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="logo-mark-bg" x1="34" y1="26" x2="220" y2="238" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4C27A" />
          <stop offset="0.42" stopColor="#D76734" />
          <stop offset="1" stopColor="#6C2412" />
        </linearGradient>
        <radialGradient
          id="logo-mark-glow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(185 72) rotate(123.111) scale(82.7069)"
        >
          <stop stopColor="#F7E3C4" />
          <stop offset="1" stopColor="#F7E3C4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="logo-mark-core" x1="103" y1="75" x2="156" y2="206" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8EE" />
          <stop offset="1" stopColor="#F6DDB4" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="236" height="236" rx="58" fill="url(#logo-mark-bg)" />
      <rect x="18" y="18" width="220" height="220" rx="50" stroke="#FFF7EB" strokeOpacity="0.28" strokeWidth="4" />
      <circle cx="186" cy="72" r="44" fill="url(#logo-mark-glow)" />
      <path
        d="M70 170C70 139.161 87.6062 112.613 123.27 77.9858C125.946 75.3871 130.054 75.3871 132.73 77.9858C168.394 112.613 186 139.161 186 170C186 205.346 160.642 230 128 230C95.3579 230 70 205.346 70 170Z"
        fill="url(#logo-mark-core)"
      />
      <path d="M146 91L118 140H141L114 190" stroke="#7B2E18" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M161 102C168.291 113.239 172 125.976 172 138C172 166.719 151.405 190 125.999 190C116.946 190 108.503 187.043 101.497 181.949"
        stroke="#0D7B5C"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <rect x="79" y="198" width="98" height="10" rx="5" fill="#F7E3C4" fillOpacity="0.44" />
    </svg>
  );
}

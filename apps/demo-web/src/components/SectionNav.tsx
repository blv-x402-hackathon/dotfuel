"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "balance-panel", label: "Balance" },
  { id: "token-flow", label: "Token" },
  { id: "sponsor-flow", label: "Sponsor" },
  { id: "tx-history", label: "History" }
] as const;

export function SectionNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        threshold: [0.2, 0.45, 0.65],
        rootMargin: "-20% 0px -30% 0px"
      }
    );

    for (const section of SECTIONS) {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Section navigation" className="section-nav">
      {SECTIONS.map((section) => (
        <button
          className={`section-nav__button ${activeId === section.id ? "section-nav__button--active" : ""}`}
          key={section.id}
          onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          type="button"
        >
          {section.label}
        </button>
      ))}
      <style jsx>{`
        .section-nav {
          position: sticky;
          top: 10px;
          z-index: 30;
          display: inline-flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0;
          padding: 8px;
          border-radius: 999px;
          border: 1px solid rgba(78, 54, 32, 0.14);
          background: rgba(255, 250, 242, 0.9);
          backdrop-filter: blur(10px);
        }

        .section-nav__button {
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          min-height: 40px;
          background: transparent;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .section-nav__button--active {
          background: var(--ink);
          color: #fffaf2;
        }
      `}</style>
    </nav>
  );
}

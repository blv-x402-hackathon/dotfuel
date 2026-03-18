"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "balance-panel", label: "Balance", tab: null },
  { id: "flow-tabs", label: "Token", tab: "token" as const },
  { id: "flow-tabs", label: "Sponsor", tab: "sponsor" as const },
  { id: "tx-history", label: "History", tab: null }
] as const;

export function SectionNav({ onTabChange }: { onTabChange?: (tab: "token" | "sponsor") => void }) {
  const [activeLabel, setActiveLabel] = useState<string>(SECTIONS[0].label);

  useEffect(() => {
    const targets = [
      { id: "balance-panel", label: "Balance" },
      { id: "flow-tabs", label: "Token" },
      { id: "tx-history", label: "History" }
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveLabel((visible[0].target as HTMLElement).dataset.navLabel ?? visible[0].target.id);
        }
      },
      {
        threshold: [0.2, 0.45, 0.65],
        rootMargin: "-20% 0px -30% 0px"
      }
    );

    for (const target of targets) {
      const node = document.getElementById(target.id);
      if (node) {
        node.dataset.navLabel = target.label;
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Section navigation" className="section-nav">
      {SECTIONS.map((section) => (
        <button
          className={`section-nav__button ${activeLabel === section.label ? "section-nav__button--active" : ""}`}
          key={`${section.id}-${section.label}`}
          onClick={() => {
            if (section.tab) onTabChange?.(section.tab);
            document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
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

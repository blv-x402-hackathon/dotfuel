"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "@/hooks/useHotkeys";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string; // emoji shorthand
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    {
      id: "nav-home",
      label: "Go to Home",
      description: "Dashboard overview",
      icon: "🏠",
      action: () => router.push("/"),
      keywords: ["dashboard", "home"]
    },
    {
      id: "nav-send",
      label: "Go to Send",
      description: "Pay gas with token",
      icon: "⚡",
      action: () => router.push("/send"),
      keywords: ["send", "transfer", "token", "gas"]
    },
    {
      id: "nav-sponsor",
      label: "Go to Sponsor",
      description: "Create gas sponsorship campaigns",
      icon: "🎯",
      action: () => router.push("/sponsor"),
      keywords: ["sponsor", "campaign"]
    },
    {
      id: "nav-history",
      label: "Go to History",
      description: "Transaction history",
      icon: "📋",
      action: () => router.push("/history"),
      keywords: ["history", "transactions", "past"]
    }
  ];

  const filtered =
    query.trim() === ""
      ? commands
      : commands.filter((c) => {
          const q = query.toLowerCase();
          return (
            c.label.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q) ||
            (c.keywords ?? []).some((k) => k.includes(q))
          );
        });

  useHotkeys([
    {
      key: "k",
      modifiers: ["cmd"],
      onPress: () => setOpen((v) => !v)
    }
  ]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) { cmd.action(); setOpen(false); }
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, filtered, activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="cmd-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmd-input-wrap">
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden className="cmd-search-icon">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Type a command or page name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc-badge" aria-label="Press Escape to close">ESC</kbd>
        </div>

        {filtered.length > 0 ? (
          <ul className="cmd-list" role="listbox" aria-label="Commands">
            {filtered.map((cmd, i) => (
              <li key={cmd.id} role="option" aria-selected={i === activeIndex}>
                <button
                  className={`cmd-item${i === activeIndex ? " cmd-item--active" : ""}`}
                  onClick={() => { cmd.action(); setOpen(false); }}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="cmd-item__icon" aria-hidden>{cmd.icon}</span>
                  <span className="cmd-item__text">
                    <span className="cmd-item__label">{cmd.label}</span>
                    {cmd.description ? <span className="cmd-item__desc">{cmd.description}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="cmd-empty">No commands found for &ldquo;{query}&rdquo;</div>
        )}

        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

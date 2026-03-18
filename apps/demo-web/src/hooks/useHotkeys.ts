"use client";

import { useEffect } from "react";

type Modifier = "cmd" | "ctrl" | "shift" | "alt";

interface HotkeyDef {
  key: string;
  modifiers?: Modifier[];
  onPress: (e: KeyboardEvent) => void;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
}

function matchesModifiers(e: KeyboardEvent, modifiers: Modifier[] = []): boolean {
  const hasMeta = modifiers.includes("cmd");
  const hasCtrl = modifiers.includes("ctrl");
  const hasShift = modifiers.includes("shift");
  const hasAlt = modifiers.includes("alt");

  // cmd = Meta on Mac, Ctrl on Windows
  const cmdOrCtrl = hasMeta || hasCtrl;
  const cmdCtrlPressed = e.metaKey || e.ctrlKey;

  if (cmdOrCtrl && !cmdCtrlPressed) return false;
  if (!cmdOrCtrl && cmdCtrlPressed) return false;
  if (hasShift && !e.shiftKey) return false;
  if (!hasShift && e.shiftKey) return false;
  if (hasAlt && !e.altKey) return false;

  return true;
}

export function useHotkeys(hotkeys: HotkeyDef[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when focus is in text input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      for (const hk of hotkeys) {
        if (e.key.toLowerCase() === hk.key.toLowerCase() && matchesModifiers(e, hk.modifiers)) {
          if (hk.preventDefault !== false) e.preventDefault();
          hk.onPress(e);
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hotkeys]);
}

"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72; // px — how far to pull before triggering
const RESISTANCE = 2.5; // divide raw pull distance by this for visual offset

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  /** Element to watch for touch. Defaults to window. */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface PullState {
  /** 0–1: how far along the threshold we are */
  progress: number;
  /** Whether refresh is currently being executed */
  refreshing: boolean;
}

export function usePullToRefresh({ onRefresh, containerRef }: UsePullToRefreshOptions): PullState {
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = containerRef?.current ?? window;
    if (!el) return;

    function getScrollTop(): number {
      if (el === window) return window.scrollY;
      return (el as HTMLElement).scrollTop;
    }

    function handleTouchStart(e: Event) {
      const te = e as TouchEvent;
      if (getScrollTop() > 0) return;
      if (refreshingRef.current) return;
      touchStartY.current = te.touches[0].clientY;
      isPulling.current = false;
    }

    function handleTouchMove(e: Event) {
      const te = e as TouchEvent;
      if (touchStartY.current === null || refreshingRef.current) return;
      const delta = te.touches[0].clientY - touchStartY.current;
      if (delta <= 0) { setProgress(0); return; }
      isPulling.current = true;
      setProgress(Math.min(1, delta / THRESHOLD / RESISTANCE));
    }

    function handleTouchEnd() {
      if (!isPulling.current || refreshingRef.current) {
        touchStartY.current = null;
        setProgress(0);
        return;
      }

      const current = progress;
      touchStartY.current = null;
      isPulling.current = false;

      if (current >= 1 / RESISTANCE) {
        // Triggered
        refreshingRef.current = true;
        setRefreshing(true);
        setProgress(0);

        const result = onRefresh();
        const done = () => {
          refreshingRef.current = false;
          setRefreshing(false);
        };

        if (result instanceof Promise) {
          result.finally(done);
        } else {
          setTimeout(done, 800);
        }
      } else {
        setProgress(0);
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, containerRef, progress]);

  return { progress, refreshing };
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast, type ToastKind } from "@/components/ToastContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";

function kindIcon(kind: ToastKind) {
  const color =
    kind === "success" ? "var(--success)" :
    kind === "error" ? "var(--danger)" :
    kind === "warning" ? "var(--warning)" :
    "rgb(59, 130, 246)";

  return (
    <span className="notif-item__dot" style={{ background: color }} aria-hidden />
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function NotificationCenter() {
  const { history, unreadCount, markAllRead, clearHistory } = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(open);

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  // Mark all read when opening
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead();
    }
  }, [open, unreadCount, markAllRead]);

  return (
    <div className="notif-center" ref={containerRef}>
      <button
        className="notif-center__trigger"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden>
          <path
            d="M10 2a6 6 0 0 0-6 6v2.586l-1.707 1.707A1 1 0 0 0 3 14h14a1 1 0 0 0 .707-1.707L16 10.586V8a6 6 0 0 0-6-6z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d="M8 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notif-center__badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notif-center__panel" role="dialog" aria-modal="true" aria-label="Notifications" ref={focusTrapRef as React.RefObject<HTMLDivElement>}>
          <div className="notif-center__header">
            <span className="notif-center__title">Notifications</span>
            <div className="notif-center__actions">
              {history.length > 0 ? (
                <button
                  className="notif-center__action"
                  onClick={clearHistory}
                  type="button"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </div>

          <div className="notif-center__list">
            {history.length === 0 ? (
              <div className="notif-center__empty">
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
                  <path
                    d="M12 3a6 6 0 0 0-6 6v3L4 14h16l-2-2V9a6 6 0 0 0-6-6zM10 17a2 2 0 0 0 4 0"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>No notifications yet</span>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className={`notif-item ${!item.read ? "notif-item--unread" : ""}`}>
                  {kindIcon(item.kind)}
                  <div className="notif-item__body">
                    <strong className="notif-item__title">{item.title}</strong>
                    {item.description ? (
                      <p className="notif-item__desc">{item.description}</p>
                    ) : null}
                    <span className="notif-item__time">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .notif-center {
          position: relative;
        }

        .notif-center__trigger {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
        }

        .notif-center__trigger:hover {
          background: rgba(36, 24, 14, 0.06);
          color: var(--ink);
        }

        .notif-center__badge {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: var(--danger);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notif-center__panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 60;
          width: 320px;
          max-height: 480px;
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          border: 1px solid var(--line);
          background: var(--card-strong);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          animation: notifIn 180ms ease;
        }

        .notif-center__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--line);
          flex: none;
        }

        .notif-center__title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
        }

        .notif-center__actions {
          display: flex;
          gap: 8px;
        }

        .notif-center__action {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 100ms ease;
        }

        .notif-center__action:hover {
          background: rgba(36, 24, 14, 0.06);
        }

        .notif-center__list {
          overflow-y: auto;
          flex: 1;
        }

        .notif-center__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 16px;
          color: var(--muted);
          font-size: 13px;
          text-align: center;
        }

        .notif-item {
          display: flex;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          transition: background 100ms ease;
        }

        .notif-item:last-child {
          border-bottom: none;
        }

        .notif-item--unread {
          background: rgba(199, 90, 46, 0.04);
        }

        :global(.notif-item__dot) {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: none;
          margin-top: 4px;
        }

        .notif-item__body {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .notif-item__title {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.3;
        }

        .notif-item__desc {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notif-item__time {
          font-size: 11px;
          color: var(--muted);
          opacity: 0.7;
        }

        @keyframes notifIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"])) .notif-center__trigger:hover { background: rgba(240, 230, 216, 0.08); }
          :global(html:not([data-theme="light"])) .notif-item--unread { background: rgba(199, 90, 46, 0.06); }
          :global(html:not([data-theme="light"])) .notif-center__action:hover { background: rgba(240, 230, 216, 0.08); }
        }

        :global(html[data-theme="dark"]) .notif-center__trigger:hover { background: rgba(240, 230, 216, 0.08); }
        :global(html[data-theme="dark"]) .notif-item--unread { background: rgba(199, 90, 46, 0.06); }
        :global(html[data-theme="dark"]) .notif-center__action:hover { background: rgba(240, 230, 216, 0.08); }

        @media (max-width: 480px) {
          .notif-center__panel {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: 70vh;
            border-radius: 24px 24px 0 0;
            border-bottom: none;
            animation: notifInMobile 240ms ease;
          }
        }

        @keyframes notifInMobile {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

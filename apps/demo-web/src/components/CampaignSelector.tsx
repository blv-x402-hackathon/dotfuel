"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { getRecentCampaigns, type RecentCampaign } from "@/lib/campaign-client";

interface CampaignSelectorProps {
  value: string;
  onChange: (id: `0x${string}`) => void;
  onError: (msg: string) => void;
}

function truncateId(id: string) {
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function formatOption(c: RecentCampaign) {
  return `${c.name} (${truncateId(c.id)})`;
}

export function CampaignSelector({ value, onChange, onError }: CampaignSelectorProps) {
  const [recent, setRecent] = useState<RecentCampaign[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState("");

  // Sync recent list on mount (client-only)
  useEffect(() => {
    setRecent(getRecentCampaigns());
  }, []);

  // If value is set from parent (e.g. env var) but not in recent list, show manual entry
  useEffect(() => {
    if (!value || value === "0x0000000000000000000000000000000000000000000000000000000000000000") return;
    const found = getRecentCampaigns().find((c) => c.id === value);
    if (!found) {
      setShowManual(true);
      setManualInput(value);
    }
  }, [value]);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__none__") return;
    onChange(val as `0x${string}`);
  }

  function handleLoad() {
    const trimmed = manualInput.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
      onError("Campaign ID must be a 32-byte hex value (0x + 64 hex chars)");
      return;
    }
    onChange(trimmed as `0x${string}`);
    // Refresh recent list in case it was updated elsewhere
    setRecent(getRecentCampaigns());
  }

  const isManualValid = /^0x[a-fA-F0-9]{64}$/.test(manualInput.trim());
  const selectedInRecent = recent.find((c) => c.id === value);

  return (
    <div className="campaign-selector">
      {recent.length > 0 ? (
        <div className="field">
          <span className="label">Recent Campaigns</span>
          <select
            className="input campaign-selector__select"
            value={selectedInRecent ? value : "__none__"}
            onChange={handleSelect}
          >
            <option value="__none__" disabled>
              {selectedInRecent ? formatOption(selectedInRecent) : "Select a campaign…"}
            </option>
            {recent.map((c) => (
              <option key={c.id} value={c.id}>
                {formatOption(c)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="campaign-selector__manual-toggle">
        <button
          type="button"
          className="campaign-selector__toggle-btn"
          aria-expanded={showManual}
          onClick={() => setShowManual((v) => !v)}
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden
            style={{
              transform: showManual ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
              flexShrink: 0,
            }}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {showManual ? "Hide manual entry" : "Enter ID manually"}
        </button>
      </div>

      {showManual ? (
        <div className="field mt-2">
          <span className="label">Campaign ID (hex)</span>
          <div className="target-input-row">
            <input
              className={`input ${manualInput.length > 0 ? (isManualValid ? "input--valid" : "input--invalid") : ""}`}
              placeholder="0x0000…0000 (32 bytes)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLoad(); } }}
            />
            <Button variant="ghost" onClick={handleLoad}>Load</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

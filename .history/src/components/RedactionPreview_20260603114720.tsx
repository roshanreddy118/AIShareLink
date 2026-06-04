"use client";

import { useState } from "react";
import { ScanResult } from "@/app/page";

interface RedactionPreviewProps {
  scanResult: ScanResult;
  onShareComplete: (url: string, id: string) => void;
  onBack: () => void;
}

export function RedactionPreview({
  scanResult,
  onShareComplete,
  onBack,
}: RedactionPreviewProps) {
  const [matches, setMatches] = useState(scanResult.matches);
  const [isSharing, setIsSharing] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [password, setPassword] = useState("");
  const [maxViews, setMaxViews] = useState<number | "">("");

  const toggleMatch = (index: number) => {
    setMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const toggleAll = (enabled: boolean) => {
    setMatches((prev) => prev.map((m) => ({ ...m, enabled })));
  };

  const getRedactedText = () => {
    let text = scanResult.text;
    const enabledMatches = matches
      .filter((m) => m.enabled)
      .sort((a, b) => b.start - a.start);

    for (const match of enabledMatches) {
      const replacement = "█".repeat(match.value.length);
      text = text.slice(0, match.start) + replacement + text.slice(match.end);
    }
    return text;
  };

  const getHighlightedText = () => {
    const parts: { text: string; isRedacted: boolean; matchIndex: number }[] = [];
    let lastEnd = 0;
    const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedMatches.length; i++) {
      const match = sortedMatches[i];
      if (match.start > lastEnd) {
        parts.push({ text: scanResult.text.slice(lastEnd, match.start), isRedacted: false, matchIndex: -1 });
      }
      parts.push({
        text: match.value,
        isRedacted: match.enabled !== false,
        matchIndex: matches.indexOf(match),
      });
      lastEnd = match.end;
    }
    if (lastEnd < scanResult.text.length) {
      parts.push({ text: scanResult.text.slice(lastEnd), isRedacted: false, matchIndex: -1 });
    }
    return parts;
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const redactedText = getRedactedText();
      const redactedContent = btoa(unescape(encodeURIComponent(redactedText)));
      const redactedItems = matches
        .filter((m) => m.enabled)
        .map((m) => `${m.label}: ${m.value.slice(0, 3)}***`);

      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: scanResult.fileName,
          fileType: scanResult.fileType,
          redactedContent,
          redactedItems,
          expiresIn: expiryHours * 60 * 60 * 1000,
          password: password || undefined,
          maxViews: maxViews || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onShareComplete(data.url, data.id);
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const enabledCount = matches.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Review Detections
          </h2>
          <p className="text-slate-400 text-sm">
            Found {matches.length} sensitive items in{" "}
            <span className="text-white">{scanResult.fileName}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Upload different file
        </button>
      </div>

      {/* Detection List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            {enabledCount} of {matches.length} items will be redacted
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
            >
              Select All
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="text-xs px-2 py-1 rounded bg-slate-600/20 text-slate-400 hover:bg-slate-600/30"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {matches.map((match, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                match.enabled
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-slate-700/30 border border-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={match.enabled}
                onChange={() => toggleMatch(i)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-600 text-slate-300 whitespace-nowrap">
                {match.label}
              </span>
              <span className="text-sm text-white font-mono truncate">
                {match.value}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Document Preview
        </h3>
        <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm leading-relaxed">
          {getHighlightedText().map((part, i) =>
            part.isRedacted ? (
              <span
                key={i}
                className="bg-red-500/30 text-red-300 px-0.5 rounded"
                title="Will be redacted"
              >
                {part.text}
              </span>
            ) : (
              <span key={i} className="text-slate-300">
                {part.text}
              </span>
            )
          )}
        </div>
      </div>

      {/* Share Options */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          Share Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Link expires in
            </label>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Password (optional)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Max views (optional)
            </label>
            <input
              type="number"
              value={maxViews}
              onChange={(e) =>
                setMaxViews(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="Unlimited"
              min={1}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleShare}
        disabled={isSharing || enabledCount === 0}
        className="w-full py-3 rounded-xl font-medium transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSharing
          ? "Generating secure link..."
          : `Generate Safe Share Link (${enabledCount} items redacted)`}
      </button>
    </div>
  );
}

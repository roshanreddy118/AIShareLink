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
  const [shareError, setShareError] = useState("");

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

  const redactImage = async (enabledMatches: typeof matches): Promise<string> => {
    const positions = scanResult.imagePositions!;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        // Draw black rectangles over matched word positions
        ctx.fillStyle = "#000000";
        for (const match of enabledMatches) {
          // Find all word boxes that overlap with this match's character range
          for (const box of positions) {
            if (box.charEnd > match.start && box.charStart < match.end) {
              ctx.fillRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4);
            }
          }
        }

        // Export as PNG base64
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Failed to load image for redaction"));
      img.src = URL.createObjectURL(scanResult.originalFile);
    });
  };

  const handleShare = async () => {
    setIsSharing(true);
    setShareError("");
    try {
      const enabledMatches = matches.filter((m) => m.enabled);
      const redactedItems = enabledMatches.map((m) => `${m.label}: ${m.value.slice(0, 3)}***`);

      let redactedContent: string;

      const isPdf = scanResult.fileType === "application/pdf" && scanResult.pdfPositions;
      const isImage = scanResult.fileType.startsWith("image/") && scanResult.imagePositions;

      if (isPdf) {
        // Use the redact-pdf API to draw black boxes on the original PDF
        const formData = new FormData();
        formData.append("file", scanResult.originalFile);
        formData.append("positions", JSON.stringify(scanResult.pdfPositions));
        formData.append(
          "matches",
          JSON.stringify(enabledMatches.map((m) => ({ start: m.start, end: m.end })))
        );

        const redactResponse = await fetch("/api/redact-pdf", {
          method: "POST",
          body: formData,
        });

        const redactData = await redactResponse.json();
        if (!redactData.success) {
          throw new Error(redactData.error || "PDF redaction failed");
        }
        redactedContent = redactData.redactedPdf;
      } else if (isImage) {
        // Draw black boxes on the original image using Canvas
        redactedContent = await redactImage(enabledMatches);
      } else {
        // For text files, use text-based redaction
        const redactedText = getRedactedText();
        redactedContent = btoa(unescape(encodeURIComponent(redactedText)));
      }

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
      } else {
        throw new Error(data.error || "Failed to generate share link");
      }
    } catch (err) {
      console.error("Share failed:", err);
      setShareError(
        err instanceof Error ? err.message : "Failed to generate share link"
      );
    } finally {
      setIsSharing(false);
    }
  };

  const enabledCount = matches.filter((m) => m.enabled).length;
  const disabledCount = matches.length - enabledCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Review
          </p>
          <h2 className="text-strong mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Confirm every redaction before the document leaves this workspace.
          </h2>
          <p className="text-soft mt-3 text-sm">
            Reviewing <span className="text-strong">{scanResult.fileName}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="outline-button w-full rounded-2xl px-4 py-3 text-sm lg:w-auto"
        >
          Upload a different file
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Detections</p>
          <p className="text-strong mt-3 text-3xl font-semibold">{matches.length}</p>
          <p className="text-soft mt-1 text-sm">Sensitive matches identified</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Selected</p>
          <p className="text-success mt-3 text-3xl font-semibold">{enabledCount}</p>
          <p className="text-soft mt-1 text-sm">Items queued for blackout</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Ignored</p>
          <p className="text-warning mt-3 text-3xl font-semibold">{disabledCount}</p>
          <p className="text-soft mt-1 text-sm">Items left visible</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
        <section className="panel-soft rounded-[1.6rem] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-strong text-lg font-medium">Detection list</h3>
              <p className="text-soft text-sm">
                Toggle each match to decide whether it should be redacted.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="surface-success text-success rounded-full px-3 py-1.5 text-xs hover:opacity-90"
              >
                Select all
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="outline-button rounded-full px-3 py-1.5 text-xs"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="scroll-panel max-h-[30rem] space-y-2 overflow-y-auto pr-1">
            {matches.map((match, i) => (
              <label
                key={i}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${
                  match.enabled
                    ? "surface-danger"
                    : "border-[color:var(--surface-border)] bg-[color:var(--surface-muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={match.enabled}
                  onChange={() => toggleMatch(i)}
                  className="mt-1 h-4 w-4 rounded accent-emerald-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="metric-pill rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">
                      {match.label}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-[0.18em] ${
                        match.enabled ? "text-danger" : "text-[color:var(--label)]"
                      }`}
                    >
                      {match.enabled ? "Will redact" : "Visible"}
                    </span>
                  </div>
                  <p className="text-strong mt-2 truncate font-mono text-sm">
                    {match.value}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel-soft rounded-[1.6rem] p-5">
            <h3 className="text-strong text-lg font-medium">Document preview</h3>
            <p className="text-soft mt-1 text-sm">
              Highlighted segments show what will be blacked out in the shared copy.
            </p>
            <div className="preview-surface scroll-panel mt-4 max-h-[22rem] overflow-y-auto rounded-[1.25rem] p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
              {getHighlightedText().map((part, i) =>
                part.isRedacted ? (
                  <span
                    key={i}
                    className="surface-danger text-danger inline break-all rounded px-0.5"
                    title="Will be redacted"
                  >
                    {part.text}
                  </span>
                ) : (
                  <span key={i} className="text-soft break-all">
                    {part.text}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="panel-soft rounded-[1.6rem] p-5">
            <h3 className="text-strong text-lg font-medium">Share settings</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-label mb-2 block text-xs uppercase tracking-[0.2em]">
                  Link expiry
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="input-surface w-full rounded-xl px-3 py-3 text-sm"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
              <div>
                <label className="text-label mb-2 block text-xs uppercase tracking-[0.2em]">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional protection"
                  className="input-surface w-full rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-label mb-2 block text-xs uppercase tracking-[0.2em]">
                  Max views
                </label>
                <input
                  type="number"
                  value={maxViews}
                  onChange={(e) =>
                    setMaxViews(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="Unlimited"
                  min={1}
                  className="input-surface w-full rounded-xl px-3 py-3 text-sm"
                />
              </div>
            </div>

            {shareError && (
              <div className="surface-danger text-danger mt-4 rounded-2xl px-4 py-3 text-sm">
                {shareError}
              </div>
            )}

            <button
              onClick={handleShare}
              disabled={isSharing || enabledCount === 0}
              className="spot-button primary-button mt-5 w-full rounded-[1.25rem] px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {isSharing
                  ? "Generating secure link..."
                  : `Generate safe share link (${enabledCount} items redacted)`}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

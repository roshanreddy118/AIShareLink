"use client";

import { useState } from "react";

interface ShareResultProps {
  url: string;
  linkId: string;
  onReset: () => void;
  onViewDashboard: () => void;
}

export function ShareResult({ url, linkId, onReset, onViewDashboard }: ShareResultProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="text-center">
        <span className="eyebrow">
          <span className="status-dot" />
          Link ready
        </span>
        <h2 className="text-strong mt-5 text-3xl font-semibold tracking-[-0.04em]">
          The protected share link is live.
        </h2>
        <p className="text-soft mx-auto mt-3 max-w-2xl text-sm leading-7 sm:text-base">
          The redacted artifact is ready to send. Copy the URL, monitor access,
          and return here any time to create another secure delivery.
        </p>
      </div>

      <div className="panel-soft rounded-[1.6rem] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-label text-xs uppercase tracking-[0.24em]">
              Share URL
            </p>
            <p className="text-success mt-2 break-all font-mono text-sm">
              {url}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className={`rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap ${
              copied
                ? "primary-button"
                : "outline-button"
            }`}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Status</p>
          <p className="text-success mt-3 text-2xl font-semibold">Active</p>
          <p className="text-soft mt-1 text-sm">Ready to be shared externally</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Link ID</p>
          <p className="text-strong mt-3 truncate font-mono text-sm">{linkId}</p>
          <p className="text-soft mt-1 text-sm">Use this for audit lookup</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Views</p>
          <p className="text-strong mt-3 text-2xl font-semibold">0</p>
          <p className="text-soft mt-1 text-sm">No recipients have opened it yet</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onViewDashboard}
          className="outline-button rounded-[1.2rem] px-6 py-3 text-sm font-medium"
        >
          View access log
        </button>
        <button
          onClick={onReset}
          className="primary-button rounded-[1.2rem] px-6 py-3 text-sm font-semibold"
        >
          Share another file
        </button>
      </div>

      <p className="text-dim text-center text-xs">
        Anyone with the URL can open the redacted copy, but the original sensitive content has been removed from this version.
      </p>
    </div>
  );
}

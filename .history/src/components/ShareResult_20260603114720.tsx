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
    <div className="text-center space-y-6 py-4">
      <div className="text-6xl">✅</div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Safe Link Generated!
        </h2>
        <p className="text-slate-400">
          Your document has been redacted and a secure link has been created.
        </p>
      </div>

      {/* Link Display */}
      <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-3">
        <div className="flex-1 text-left">
          <p className="text-xs text-slate-500 mb-1">Share this link:</p>
          <p className="text-emerald-400 font-mono text-sm break-all">
            {url}
          </p>
        </div>
        <button
          onClick={copyToClipboard}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 text-left">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-xs text-slate-500">Status</p>
          <p className="text-sm text-emerald-400 font-medium">Active</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-xs text-slate-500">Link ID</p>
          <p className="text-sm text-white font-mono">{linkId}</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-xs text-slate-500">Views</p>
          <p className="text-sm text-white">0 so far</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onViewDashboard}
          className="px-6 py-2.5 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm font-medium"
        >
          View Access Log
        </button>
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm font-medium"
        >
          Share Another File
        </button>
      </div>

      <p className="text-xs text-slate-600">
        Anyone with this link can view the redacted document. Original sensitive data has been permanently removed.
      </p>
    </div>
  );
}

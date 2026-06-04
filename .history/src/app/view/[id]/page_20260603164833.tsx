"use client";

import { useState, useEffect, use } from "react";

interface ViewData {
  fileName: string;
  fileType: string;
  redactedContent: string;
  redactedItems: string[];
  createdAt: number;
  expiresAt: number;
}

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ViewData | null>(null);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument("");
  }, [id]);

  const fetchDocument = async (pwd: string) => {
    setLoading(true);
    try {
      const url = pwd
        ? `/api/view/${id}?password=${encodeURIComponent(pwd)}`
        : `/api/view/${id}`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.status === 401 && result.needsPassword) {
        setNeedsPassword(true);
        setFileName(result.fileName);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(result.error || "Failed to load document");
        setLoading(false);
        return;
      }

      setData(result);
      setNeedsPassword(false);
    } catch {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocument(password);
  };

  const getDecodedContent = () => {
    if (!data) return "";
    try {
      return decodeURIComponent(escape(atob(data.redactedContent)));
    } catch {
      return atob(data.redactedContent);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-white">Link Unavailable</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  if (needsPassword) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-sm w-full mx-4">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔐</div>
            <h1 className="text-xl font-bold text-white">Password Required</h1>
            <p className="text-slate-400 text-sm">
              Enter the password to view{" "}
              <span className="text-white">{fileName}</span>
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const content = getDecodedContent();
  const timeLeft = Math.max(0, data.expiresAt - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              🛡️
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {data.fileName}
              </h1>
              <p className="text-xs text-slate-400">
                Shared via Safe Share • Sensitive info redacted
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Expires in</p>
            <p className="text-sm text-amber-400">
              {hoursLeft}h {minsLeft}m
            </p>
          </div>
        </div>

        {/* Redaction Notice */}
        {data.redactedItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <p className="text-amber-400 text-sm font-medium mb-1">
              ⚠️ The following information has been redacted:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.redactedItems.map((item, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Document Content */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 overflow-hidden">
          <div className="whitespace-pre-wrap break-all overflow-x-auto font-mono text-sm text-slate-300 leading-relaxed max-w-full">
            {content}
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `redacted-${data.fileName.replace(/\.[^.]+$/, "")}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            Download Redacted File
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-600">
            This document was shared securely using Safe Share.
            Sensitive information has been permanently removed from this version.
          </p>
        </div>
      </div>
    </main>
  );
}

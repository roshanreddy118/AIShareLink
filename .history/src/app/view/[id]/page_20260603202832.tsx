"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AmbientShell } from "@/components/AmbientShell";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const [currentTime, setCurrentTime] = useState(0);

  const fetchDocument = useCallback(async (pwd: string) => {
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
      setCurrentTime(Date.now());
    } catch {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchDocument("");
    }, 0);
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchDocument]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    void fetchDocument(password);
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
      <AmbientShell className="flex items-center justify-center">
        <div className="page-frame flex h-full items-center justify-center">
          <div className="surface-success flex h-16 w-16 items-center justify-center rounded-full">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
          </div>
        </div>
      </AmbientShell>
    );
  }

  if (error) {
    return (
      <AmbientShell className="flex items-center justify-center px-4">
        <div className="page-frame panel w-full max-w-lg rounded-[2rem] p-8 text-center">
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Secure link
          </p>
          <h1 className="text-strong mt-4 text-3xl font-semibold tracking-[-0.04em]">
            Link unavailable
          </h1>
          <p className="text-soft mt-3 text-sm leading-7">{error}</p>
        </div>
      </AmbientShell>
    );
  }

  if (needsPassword) {
    return (
      <AmbientShell className="flex items-center justify-center px-4">
        <div className="page-frame panel w-full max-w-md rounded-[2rem] p-8">
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Protected access
          </p>
          <h1 className="text-strong mt-4 text-3xl font-semibold tracking-[-0.04em]">
            Password required
          </h1>
          <p className="text-soft mt-3 text-sm leading-7">
            Enter the password to view <span className="text-strong">{fileName}</span>.
          </p>
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-surface w-full rounded-xl px-4 py-3"
              autoFocus
            />
            <button
              type="submit"
              className="spot-button primary-button w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <span>Unlock document</span>
            </button>
          </form>
        </div>
      </AmbientShell>
    );
  }

  if (!data) return null;

  const isPdf = data.fileType === "application/pdf" || data.fileName.endsWith(".pdf");
  const isImage = data.fileType.startsWith("image/");
  const content = (isPdf || isImage) ? "" : getDecodedContent();
  const pdfDataUrl = isPdf ? `data:application/pdf;base64,${data.redactedContent}` : "";
  const imageDataUrl = isImage ? `data:image/png;base64,${data.redactedContent}` : "";
  const referenceTime = currentTime || data.createdAt;
  const timeLeft = Math.max(0, data.expiresAt - referenceTime);
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <AmbientShell>
      <div className="page-frame mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="panel-soft mb-6 rounded-[1.75rem] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-label text-xs uppercase tracking-[0.24em]">
                Safe Share delivery
              </p>
              <h1 className="text-strong mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {data.fileName}
              </h1>
              <p className="text-soft mt-2 text-sm">
                Shared as a redacted document with sensitive information removed.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:w-[20rem]">
              <div className="flex justify-start sm:justify-end">
                <ThemeToggle />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div className="data-card">
                <p className="text-label text-xs uppercase tracking-[0.2em]">Expires in</p>
                <p className="text-warning mt-3 text-2xl font-semibold">
                  {hoursLeft}h {minsLeft}m
                </p>
              </div>
              <div className="data-card">
                <p className="text-label text-xs uppercase tracking-[0.2em]">Protection</p>
                <p className="text-success mt-3 text-2xl font-semibold">Redacted</p>
              </div>
              </div>
            </div>
          </div>
        </div>

        {data.redactedItems.length > 0 && (
          <div className="surface-warning mb-5 rounded-[1.5rem] p-4">
            <p className="text-warning text-sm font-medium">
              The following information was masked before sharing:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.redactedItems.map((item, i) => (
                <span
                  key={i}
                  className="surface-warning text-warning rounded-full px-3 py-1 text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {isPdf ? (
          <div className="panel overflow-hidden rounded-[1.8rem]">
            <iframe
              src={pdfDataUrl}
              className="h-[70vh] w-full"
              title="Redacted Document"
            />
          </div>
        ) : (
          <div className="panel rounded-[1.8rem] p-6">
            <div className="text-soft scroll-panel max-h-[70vh] overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all font-mono text-sm leading-relaxed">
              {content}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <button
            onClick={async () => {
              const baseName = data.fileName.replace(/\.[^.]+$/, "");

              if (isPdf) {
                const binaryString = atob(data.redactedContent);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `redacted-${baseName}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } else {
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `redacted-${baseName}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            }}
            className="spot-button primary-button rounded-[1.2rem] px-5 py-3 text-sm font-semibold"
          >
            <span>Download redacted file</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-dim text-xs">
            This document was shared through Safe Share. Sensitive data was removed from this version before delivery.
          </p>
        </div>
      </div>
    </AmbientShell>
  );
}

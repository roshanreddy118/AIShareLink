"use client";

import { useCallback, useEffect, useState } from "react";

interface ViewRecord {
  timestamp: number;
  ip: string;
  userAgent: string;
}

interface LinkDashboardProps {
  linkId: string;
  onBack: () => void;
}

export function LinkDashboard({ linkId, onBack }: LinkDashboardProps) {
  const [views, setViews] = useState<ViewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/view/${linkId}`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setViews(data.views);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      void fetchStats();
    }, 0);
    const interval = setInterval(() => {
      void fetchStats();
    }, 5000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchStats]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const parseUserAgent = (ua: string) => {
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Audit
          </p>
          <h2 className="text-strong mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Access activity for this secure link
          </h2>
          <p className="text-soft mt-3 text-sm">
            Link ID: <span className="text-strong font-mono">{linkId}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="outline-button w-full rounded-2xl px-4 py-3 text-sm lg:w-auto"
        >
          Back to share summary
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Total views</p>
          <p className="text-success mt-3 text-3xl font-semibold">{views.length}</p>
          <p className="text-soft mt-1 text-sm">Every successful document open</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Unique visitors</p>
          <p className="text-strong mt-3 text-3xl font-semibold">
            {new Set(views.map((v) => v.ip)).size}
          </p>
          <p className="text-soft mt-1 text-sm">Distinct IP addresses seen so far</p>
        </div>
        <div className="data-card">
          <p className="text-label text-xs uppercase tracking-[0.2em]">Refresh</p>
          <p className="text-warning mt-3 text-3xl font-semibold">5s</p>
          <p className="text-soft mt-1 text-sm">Auto-poll interval for new activity</p>
        </div>
      </div>

      <div className="panel-soft rounded-[1.6rem] p-5">
        <h3 className="text-strong text-lg font-medium">Recent activity</h3>
        {loading ? (
          <div className="text-dim py-10 text-center">Loading activity...</div>
        ) : views.length === 0 ? (
          <div className="surface-deep rounded-[1.4rem] py-10 text-center text-[color:var(--label)]">
            <p className="text-soft text-base">No one has viewed this link yet</p>
            <p className="mt-2 text-xs">Share the URL and check back here for live activity.</p>
          </div>
        ) : (
          <div className="scroll-panel mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {views
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((view, i) => (
                <div
                  key={i}
                  className="surface-deep flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface-muted)] text-xs text-[color:var(--text-soft)]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-strong text-sm">
                        {view.ip === "unknown" ? "Unknown IP" : view.ip}
                      </p>
                      <p className="text-label text-xs">
                        {parseUserAgent(view.userAgent)}
                      </p>
                    </div>
                  </div>
                  <span className="text-soft text-xs">
                    {formatTime(view.timestamp)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="text-dim text-center text-xs">
        Auto-refreshes every 5 seconds
      </p>
    </div>
  );
}

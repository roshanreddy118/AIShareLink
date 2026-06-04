"use client";

import { useState, useEffect } from "react";

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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [linkId]);

  const fetchStats = async () => {
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
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Access Log</h2>
          <p className="text-slate-400 text-sm">
            Link ID: <span className="font-mono text-slate-300">{linkId}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{views.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total Views</p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">
            {new Set(views.map((v) => v.ip)).size}
          </p>
          <p className="text-xs text-slate-400 mt-1">Unique Visitors</p>
        </div>
      </div>

      {/* View Log */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Recent Activity
        </h3>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : views.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">👀</div>
            <p>No one has viewed this link yet</p>
            <p className="text-xs mt-1">Share it and check back here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {views
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((view, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs text-slate-300">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        {view.ip === "unknown" ? "Unknown IP" : view.ip}
                      </p>
                      <p className="text-xs text-slate-500">
                        {parseUserAgent(view.userAgent)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatTime(view.timestamp)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 text-center">
        Auto-refreshes every 5 seconds
      </p>
    </div>
  );
}

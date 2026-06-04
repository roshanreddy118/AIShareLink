"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { RedactionPreview } from "@/components/RedactionPreview";
import { ShareResult } from "@/components/ShareResult";
import { LinkDashboard } from "@/components/LinkDashboard";

interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  label: string;
  enabled?: boolean;
}

export interface ScanResult {
  fileName: string;
  fileType: string;
  text: string;
  matches: PIIMatch[];
  originalFile: File;
}

type Step = "upload" | "review" | "shared" | "dashboard";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareId, setShareId] = useState<string>("");

  const handleScanComplete = useCallback((result: ScanResult) => {
    result.matches = result.matches.map((m) => ({ ...m, enabled: true }));
    setScanResult(result);
    setStep("review");
  }, []);

  const handleShareComplete = useCallback((url: string, id: string) => {
    setShareUrl(url);
    setShareId(id);
    setStep("shared");
  }, []);

  const handleReset = useCallback(() => {
    setScanResult(null);
    setShareUrl("");
    setShareId("");
    setStep("upload");
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🛡️ Safe Share
          </h1>
          <p className="text-slate-400 text-lg">
            Upload. Redact PII. Share securely. Track access.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {["Upload", "Review & Redact", "Share"].map((label, i) => {
            const stepIndex = ["upload", "review", "shared"].indexOf(step);
            const isActive = i <= stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-sm ${
                    isActive ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isActive ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 shadow-2xl">
          {step === "upload" && (
            <FileUpload onScanComplete={handleScanComplete} />
          )}
          {step === "review" && scanResult && (
            <RedactionPreview
              scanResult={scanResult}
              onShareComplete={handleShareComplete}
              onBack={handleReset}
            />
          )}
          {step === "shared" && (
            <ShareResult
              url={shareUrl}
              linkId={shareId}
              onReset={handleReset}
              onViewDashboard={() => setStep("dashboard")}
            />
          )}
          {step === "dashboard" && (
            <LinkDashboard
              linkId={shareId}
              onBack={() => setStep("shared")}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-6">
          Your original file is never stored. Only the redacted version is temporarily saved for sharing.
        </p>
      </div>
    </main>
  );
}

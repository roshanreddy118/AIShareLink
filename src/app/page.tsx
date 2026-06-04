"use client";

import { useState, useCallback } from "react";
import { AmbientShell } from "@/components/AmbientShell";
import { FileUpload } from "@/components/FileUpload";
import { RedactionPreview } from "@/components/RedactionPreview";
import { ShareResult } from "@/components/ShareResult";
import { LinkDashboard } from "@/components/LinkDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  label: string;
  enabled?: boolean;
  imageLineIndex?: number;
}

export interface ImageWordBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  charStart: number;
  charEnd: number;
  lineIndex?: number;
}

export interface ScanResult {
  fileName: string;
  fileType: string;
  text: string;
  matches: PIIMatch[];
  originalFile: File;
  pdfPositions?: { text: string; x: number; y: number; width: number; height: number; pageIndex: number; charStart: number; charEnd: number }[];
  imagePositions?: ImageWordBox[];
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
    <AmbientShell>
      <div className="page-frame mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="panel-soft mb-8 rounded-[1.75rem] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="eyebrow mb-4">
                <span className="status-dot" />
                Private redaction workspace
              </span>
              <h1 className="section-title text-strong">Safe Share</h1>
              <p className="muted text-balance mt-4 max-w-xl text-base leading-7 sm:text-lg">
                A sharper way to prepare sensitive files for external sharing.
                Scan, mask, approve, and publish from one controlled flow.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 lg:w-[28rem]">
              <div className="flex justify-start sm:justify-end">
                <ThemeToggle />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="data-card">
                <p className="text-label text-xs uppercase tracking-[0.2em]">
                  Storage
                </p>
                <p className="text-strong mt-3 text-2xl font-semibold">0</p>
                <p className="text-soft mt-1 text-sm">Original files retained</p>
              </div>
              <div className="data-card">
                <p className="text-label text-xs uppercase tracking-[0.2em]">
                  Workflow
                </p>
                <p className="text-strong mt-3 text-2xl font-semibold">3</p>
                <p className="text-soft mt-1 text-sm">Steps from upload to delivery</p>
              </div>
              <div className="data-card col-span-2 sm:col-span-1">
                <p className="text-label text-xs uppercase tracking-[0.2em]">
                  Link controls
                </p>
                <p className="text-strong mt-3 text-2xl font-semibold">Live</p>
                <p className="text-soft mt-1 text-sm">Expiry, password, and view limits</p>
              </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1.45fr_0.8fr]">
          <div className="panel security-pattern relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-8 sm:py-9">
            <div className="hero-orb hero-orb--a left-[-2rem] top-8 h-28 w-28 bg-[color:var(--success-bg)]" />
            <div className="hero-orb hero-orb--b right-10 top-[-1rem] h-24 w-24 bg-[color:var(--warning-bg)]" />
            <div className="relative z-10 max-w-2xl">
              <span className="glow-pill inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em]">
                Calm on the outside. Strict underneath.
              </span>
              <h2 className="text-strong mt-5 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Premium document sharing built around trust signals, not clutter.
              </h2>
              <p className="muted mt-4 max-w-xl text-sm leading-7 sm:text-base">
                The redesign leans into a cinematic security aesthetic, but every
                visual choice still supports the job: faster reviews, clearer redaction
                choices, and more confident sharing.
              </p>
            </div>
          </div>

          <div className="panel-soft rounded-[2rem] p-5 sm:p-6">
            <p className="text-label text-xs uppercase tracking-[0.24em]">
              Flow status
            </p>
            <div className="mt-5 space-y-4">
              {["Upload", "Review & Redact", "Publish Secure Link"].map((label, i) => {
                const stepIndex = ["upload", "review", "shared"].indexOf(step);
                const isActive = i <= stepIndex;
                const isCurrent = i === stepIndex;

                return (
                  <div
                    key={label}
                    className={`rounded-2xl border px-4 py-4 ${
                      isCurrent
                        ? "active-step"
                        : isActive
                          ? "border-[color:var(--surface-border-strong)] bg-[color:var(--surface-muted)]"
                          : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                          isCurrent
                            ? "active-step-badge"
                            : isActive
                              ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                              : "bg-[color:var(--surface-muted)] text-[color:var(--label)]"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-strong text-sm font-medium">{label}</p>
                        <p className="text-soft text-xs">
                          {isCurrent
                            ? "Current phase"
                            : isActive
                              ? "Completed"
                              : "Waiting"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel rounded-[2rem] p-4 sm:p-6 lg:p-8">
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
        </section>

        <footer className="muted mt-6 text-center text-sm">
          Your original file stays in memory during processing. Only the redacted
          share artifact is stored temporarily for delivery.
        </footer>
      </div>
    </AmbientShell>
  );
}

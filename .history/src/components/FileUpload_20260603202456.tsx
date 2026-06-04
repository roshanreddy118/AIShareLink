"use client";

import { useState, useRef } from "react";
import { ScanResult } from "@/app/page";

interface FileUploadProps {
  onScanComplete: (result: ScanResult) => void;
}

export function FileUpload({ onScanComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError("");
    setStatus("Scanning file for sensitive information...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // For images, run OCR client-side first
      if (file.type.startsWith("image/")) {
        setStatus("Preparing image for OCR...");
        const optimized = await resizeForOCR(file);
        setStatus("Running OCR on image...");
        const text = await runClientOCR(optimized);
        formData.append("extractedText", text);
      }

      setStatus("Detecting PII patterns...");
      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Scan failed");
      }

      const data = await response.json();

      onScanComplete({
        fileName: data.fileName,
        fileType: data.fileType,
        text: data.text,
        matches: data.matches,
        originalFile: file,
        pdfPositions: data.pdfPositions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  };

  const resizeForOCR = async (file: File): Promise<File | Blob> => {
    const MAX_DIM = 2000;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= MAX_DIM && img.height <= MAX_DIM) {
          resolve(file);
          return;
        }
        const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          "image/png"
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const runClientOCR = async (file: File | Blob): Promise<string> => {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") {
          setStatus(`OCR: ${Math.round(m.progress * 100)}% complete...`);
        } else if (m.status === "loading language traineddata") {
          setStatus("Loading OCR model (first time may take a moment)...");
        }
      },
    });
    const {
      data: { text },
    } = await worker.recognize(file);
    await worker.terminate();
    return text;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const acceptedTypes = ".pdf,.png,.jpg,.jpeg,.webp,.txt";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5">
        <div>
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Intake
          </p>
          <h2 className="text-strong mt-3 text-3xl font-semibold tracking-[-0.04em]">
            Bring in a file and let the workspace identify what needs protecting.
          </h2>
          <p className="muted mt-3 max-w-2xl text-sm leading-7 sm:text-base">
            The experience is designed to feel premium, but the job stays practical:
            upload once, review detections, confirm redactions, and publish a controlled link.
          </p>
        </div>

        <div
          className={`security-pattern relative overflow-hidden rounded-[1.75rem] border border-dashed px-6 py-10 text-center transition-all sm:px-8 sm:py-14 ${
            isDragging
              ? "surface-success shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_24%,transparent),0_0_40px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
              : "border-[color:var(--surface-border-strong)] bg-[color:var(--surface-muted)] hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--surface-soft)]"
          } ${isProcessing ? "pointer-events-none opacity-70" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--surface-border-strong)] to-transparent" />

          {isProcessing ? (
            <div className="space-y-4">
              <div className="surface-success mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
              </div>
              <div>
                <p className="text-success text-lg font-medium">
                  Processing document
                </p>
                <p className="text-soft mt-2 text-sm">{status}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="surface-deep mx-auto flex h-18 w-18 items-center justify-center rounded-[1.4rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-success h-8 w-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 7.5 12 3m0 0 4.5 4.5M12 3v12m-7.5 1.5V18A2.25 2.25 0 0 0 6.75 20.25h10.5A2.25 2.25 0 0 0 19.5 18v-1.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-strong text-2xl font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="text-soft mt-3 text-sm">
                  Supports PDF, PNG, JPG, WebP, and plain text.
                </p>
              </div>
              <div className="text-dim flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="metric-pill rounded-full px-3 py-1.5">
                  Max 10MB
                </span>
                <span className="metric-pill rounded-full px-3 py-1.5">
                  In-memory processing
                </span>
                <span className="metric-pill rounded-full px-3 py-1.5">
                  OCR for images
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="surface-danger text-danger rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="panel-soft rounded-[1.6rem] p-5">
          <p className="text-label text-xs uppercase tracking-[0.24em]">
            Safeguards
          </p>
          <div className="mt-4 space-y-3">
            <div className="data-card">
              <p className="text-strong text-sm font-medium">Original never retained</p>
              <p className="text-soft mt-2 text-sm">
                The source document is processed for detection and redaction without becoming part of the share artifact.
              </p>
            </div>
            <div className="data-card">
              <p className="text-strong text-sm font-medium">Share controls included</p>
              <p className="text-soft mt-2 text-sm">
                Add expiry, passwords, and view limits before anything leaves this workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="panel-soft rounded-2xl p-4">
            <p className="text-label text-xs uppercase tracking-[0.2em]">PDF</p>
            <p className="text-strong mt-2 text-sm">Structured documents with position-aware redaction.</p>
          </div>
          <div className="panel-soft rounded-2xl p-4">
            <p className="text-label text-xs uppercase tracking-[0.2em]">Image OCR</p>
            <p className="text-strong mt-2 text-sm">Extract text from screenshots and scans before masking sensitive content.</p>
          </div>
          <div className="panel-soft rounded-2xl p-4">
            <p className="text-label text-xs uppercase tracking-[0.2em]">Text</p>
            <p className="text-strong mt-2 text-sm">Handle direct text files for the fastest review workflow.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

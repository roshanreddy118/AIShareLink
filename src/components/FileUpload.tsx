"use client";

import { useRef, useState } from "react";
import { ImageWordBox, ScanResult } from "@/app/page";

interface FileUploadProps {
  onScanComplete: (result: ScanResult) => void;
}

export function FileUpload({ onScanComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError("");
    setStatus("Scanning file for sensitive information...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      let imageWordBoxes: ImageWordBox[] | undefined;
      let imageText: string | undefined;
      if (file.type.startsWith("image/")) {
        setStatus("Preparing image scan...");
        const optimized = await resizeForImageScan(file);
        setStatus("Reading text in image...");
        const ocrResult = await runClientOCR(
          optimized.blob,
          optimized.scaleX,
          optimized.scaleY
        );
        formData.append("extractedText", ocrResult.text);
        imageText = ocrResult.text;
        imageWordBoxes = ocrResult.wordBoxes;
      }

      setStatus(
        file.type.startsWith("image/")
          ? "Preparing screenshot redactions..."
          : "Detecting PII patterns..."
      );
      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Scan failed");
      }

      const data = await response.json();
      const isImage = file.type.startsWith("image/");
      const matches = isImage
        ? buildImageMatches(imageWordBoxes || [], data.matches || [])
        : data.matches;

      if (isImage && imageText?.trim() && imageWordBoxes?.length === 0) {
        throw new Error(
          "Image text was detected, but no word positions were returned for redaction. Try a clearer screenshot or PDF export."
        );
      }

      onScanComplete({
        fileName: data.fileName,
        fileType: data.fileType,
        text: data.text,
        matches,
        originalFile: file,
        pdfPositions: data.pdfPositions,
        imagePositions: imageWordBoxes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  };

  const resizeForImageScan = async (
    file: File
  ): Promise<{ blob: File | Blob; scaleX: number; scaleY: number }> => {
    const maxDimension = 2000;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxDimension && img.height <= maxDimension) {
          resolve({ blob: file, scaleX: 1, scaleY: 1 });
          return;
        }

        const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) =>
            resolve({
              blob: blob || file,
              scaleX: img.width / canvas.width,
              scaleY: img.height / canvas.height,
            }),
          "image/png"
        );
      };
      img.onerror = () => resolve({ blob: file, scaleX: 1, scaleY: 1 });
      img.src = URL.createObjectURL(file);
    });
  };

  const runClientOCR = async (
    file: File | Blob,
    scaleX: number,
    scaleY: number
  ): Promise<{ text: string; wordBoxes: ImageWordBox[] }> => {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") {
          setStatus(`Image scan: ${Math.round(m.progress * 100)}% complete...`);
        } else if (m.status === "loading language traineddata") {
          setStatus("Loading image text model...");
        }
      },
    });
    const { data } = await worker.recognize(file, {}, { blocks: true });
    await worker.terminate();

    const wordBoxes: ImageWordBox[] = [];
    let charOffset = 0;
    const pageData = data as {
      blocks?: Array<{
        paragraphs?: Array<{
          lines?: Array<{
            words?: Array<OCRWord>;
          }>;
        }>;
      }> | null;
      lines?: Array<{
        words?: Array<OCRWord>;
      }>;
      words?: Array<OCRWord>;
    };
    const recognizedLines: string[] = [];

    getOCRLines(pageData).forEach((words, lineIndex) => {
      const lineText: string[] = [];

      for (const word of words) {
        const text = word.text?.trim();
        if (!text || !word.bbox) continue;

        if (lineText.length > 0) {
          charOffset += 1;
        }

        const charStart = charOffset;
        const charEnd = charStart + text.length;
        lineText.push(text);
        wordBoxes.push({
          text,
          x: word.bbox.x0 * scaleX,
          y: word.bbox.y0 * scaleY,
          width: (word.bbox.x1 - word.bbox.x0) * scaleX,
          height: (word.bbox.y1 - word.bbox.y0) * scaleY,
          charStart,
          charEnd,
          lineIndex,
        });
        charOffset = charEnd;
      }

      if (lineText.length > 0) {
        recognizedLines.push(lineText.join(" "));
        charOffset += 1;
      }
    });

    const text = recognizedLines.length > 0 ? recognizedLines.join("\n") : data.text;
    return { text, wordBoxes };
  };

  type OCRWord = {
    text?: string;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  };

  const getOCRLines = (pageData: {
    blocks?: Array<{
      paragraphs?: Array<{
        lines?: Array<{ words?: Array<OCRWord> }>;
      }>;
    }> | null;
    lines?: Array<{ words?: Array<OCRWord> }>;
    words?: Array<OCRWord>;
  }): OCRWord[][] => {
    const blockLines =
      pageData.blocks?.flatMap((block) =>
        block.paragraphs?.flatMap((paragraph) =>
          paragraph.lines?.map((line) => line.words || []) || []
        ) || []
      ) || [];

    if (blockLines.length > 0) return blockLines;

    const directLines = pageData.lines?.map((line) => line.words || []) || [];
    if (directLines.length > 0) return directLines;

    return pageData.words?.length ? [pageData.words] : [];
  };

  const buildImageMatches = (
    wordBoxes: ImageWordBox[],
    detectedMatches: ScanResult["matches"]
  ): ScanResult["matches"] => {
    if (detectedMatches.length > 0) {
      return detectedMatches.map((match) => {
        const overlappingBoxes = wordBoxes.filter(
          (box) => box.charEnd > match.start && box.charStart < match.end
        );
        const firstLineIndex = overlappingBoxes[0]?.lineIndex;
        const sameLine =
          firstLineIndex !== undefined &&
          overlappingBoxes.every((box) => box.lineIndex === firstLineIndex);

        return {
          ...match,
          imageLineIndex: sameLine ? firstLineIndex : undefined,
        };
      });
    }

    const lineGroups = new Map<number, ImageWordBox[]>();

    for (const box of wordBoxes) {
      if (!box.text.trim()) continue;
      const lineIndex = box.lineIndex ?? box.charStart;
      lineGroups.set(lineIndex, [...(lineGroups.get(lineIndex) || []), box]);
    }

    return Array.from(lineGroups.entries())
      .map(([lineIndex, lineBoxes], index) => {
        const sortedBoxes = [...lineBoxes].sort((a, b) => a.charStart - b.charStart);
        const value = sortedBoxes.map((box) => box.text).join(" ").trim();
        const start = Math.min(...sortedBoxes.map((box) => box.charStart));
        const end = Math.max(...sortedBoxes.map((box) => box.charEnd));

        return {
          type: "screenshot_text",
          value,
          start,
          end,
          label: `Screenshot text line ${index + 1}`,
          imageLineIndex: lineIndex,
        };
      })
      .filter((match) => match.value.length > 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  };

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
        >
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
                  Drop a file here or choose one below
                </p>
                <p className="text-soft mt-3 text-sm">
                  Supports PDF, PNG, JPG, WebP, and plain text.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    documentInputRef.current?.click();
                  }}
                  className="spot-button primary-button rounded-[1.1rem] px-4 py-3 text-sm font-semibold"
                >
                  <span>Choose PDF or text file</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    imageInputRef.current?.click();
                  }}
                  className="outline-button rounded-[1.1rem] px-4 py-3 text-sm font-semibold"
                >
                  Choose image
                </button>
              </div>
              <div className="text-dim flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="metric-pill rounded-full px-3 py-1.5">
                  Max 10MB
                </span>
                <span className="metric-pill rounded-full px-3 py-1.5">
                  In-memory processing
                </span>
                <span className="metric-pill rounded-full px-3 py-1.5">
                  Broad screenshot coverage
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
            <p className="text-label text-xs uppercase tracking-[0.2em]">Image</p>
            <p className="text-strong mt-2 text-sm">Cover readable screenshot text in the redacted copy.</p>
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

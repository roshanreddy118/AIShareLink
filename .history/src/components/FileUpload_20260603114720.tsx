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
        setStatus("Running OCR on image...");
        const text = await runClientOCR(file);
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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  };

  const runClientOCR = async (file: File): Promise<string> => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
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
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-400 bg-emerald-400/10"
            : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
        } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
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

        {isProcessing ? (
          <div className="space-y-3">
            <div className="animate-spin w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full mx-auto" />
            <p className="text-emerald-400 font-medium">{status}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📄</div>
            <p className="text-white font-medium text-lg">
              Drop your file here or click to browse
            </p>
            <p className="text-slate-400 text-sm">
              Supports PDF, Images (PNG, JPG, WebP), and Text files
            </p>
            <p className="text-slate-500 text-xs">
              Max 10MB • Your file is processed in memory and never stored
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-lg mb-1">📋</div>
          <div>PDF Documents</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-lg mb-1">🖼️</div>
          <div>Images (OCR)</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-lg mb-1">📝</div>
          <div>Text Files</div>
        </div>
      </div>
    </div>
  );
}

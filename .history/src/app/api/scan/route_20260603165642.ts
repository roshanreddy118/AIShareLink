import { NextRequest, NextResponse } from "next/server";
import { detectPII, PIIMatch } from "@/lib/pii-detector";
import { detectPIIWithAI } from "@/lib/ai-detector";
import { extractPdfWithPositions, TextPosition } from "@/lib/pdf-extract";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = file.type;
    let text = "";
    let extractionMethod = "";

    if (fileType === "application/pdf") {
      // Extract text from PDF using pdfjs-dist legacy (Node.js compatible)
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractPdfText(buffer);
      extractionMethod = "pdfjs-dist";
    } else if (fileType.startsWith("image/")) {
      // For images, text extraction happens client-side via Tesseract.js
      // This endpoint receives the extracted text from the client
      const extractedText = formData.get("extractedText") as string;
      if (extractedText) {
        text = extractedText;
        extractionMethod = "client-ocr";
      } else {
        return NextResponse.json({
          error: "Image files require client-side OCR. Send extractedText field.",
        }, { status: 400 });
      }
    } else {
      // Plain text files
      text = await file.text();
      extractionMethod = "direct";
    }

    // Run regex and AI detection in parallel
    const [regexMatches, aiMatches] = await Promise.all([
      Promise.resolve(detectPII(text)),
      detectPIIWithAI(text),
    ]);

    // Merge and deduplicate (AI matches that overlap with regex are skipped)
    const matches: PIIMatch[] = [...regexMatches];
    for (const aiMatch of aiMatches) {
      const overlaps = regexMatches.some(
        (rm) => aiMatch.start < rm.end && aiMatch.end > rm.start
      );
      if (!overlaps) {
        matches.push(aiMatch);
      }
    }
    matches.sort((a, b) => a.start - b.start);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType,
      extractionMethod,
      textLength: text.length,
      matches,
      text,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { detectPII, PIIMatch } from "@/lib/pii-detector";

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
      // Extract text from PDF
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const pdf = await pdfParse(buffer);
      text = pdf.text;
      extractionMethod = "pdf-parse";
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

    const matches: PIIMatch[] = detectPII(text);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType,
      extractionMethod,
      textLength: text.length,
      matches,
      text, // Send text back for preview (client will redact visually)
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

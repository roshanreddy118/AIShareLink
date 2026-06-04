import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import { TextPosition } from "@/lib/pdf-extract";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const positionsJson = formData.get("positions") as string;
    const matchesJson = formData.get("matches") as string;

    if (!file || !positionsJson || !matchesJson) {
      return NextResponse.json(
        { error: "Missing file, positions, or matches" },
        { status: 400 }
      );
    }

    const positions: TextPosition[] = JSON.parse(positionsJson);
    const matches: { start: number; end: number }[] = JSON.parse(matchesJson);

    // Load the original PDF
    const pdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // For each match, find overlapping text positions and draw black boxes
    for (const match of matches) {
      // Find all text positions that overlap with this match
      const overlapping = positions.filter(
        (pos) => pos.charStart < match.end && pos.charEnd > match.start
      );

      for (const pos of overlapping) {
        const page = pages[pos.pageIndex];
        if (!page) continue;

        const pageHeight = page.getHeight();

        // Calculate the portion of this text item that's redacted
        const overlapStart = Math.max(match.start, pos.charStart);
        const overlapEnd = Math.min(match.end, pos.charEnd);

        // Calculate x offset for partial redaction
        const fullText = pos.text;
        const startInItem = overlapStart - pos.charStart;
        const endInItem = overlapEnd - pos.charStart;

        // Estimate character width (proportional)
        const charWidth = pos.width / Math.max(fullText.length, 1);
        const redactX = pos.x + startInItem * charWidth;
        const redactWidth = (endInItem - startInItem) * charWidth;

        // Draw black rectangle over the text
        // PDF y-coordinate: text baseline, so box starts slightly below
        const padding = 2;
        page.drawRectangle({
          x: redactX - padding,
          y: pos.y - padding,
          width: redactWidth + padding * 2,
          height: pos.height + padding * 2,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Save the redacted PDF
    const redactedBytes = await pdfDoc.save();
    const base64 = Buffer.from(redactedBytes).toString("base64");

    return NextResponse.json({
      success: true,
      redactedPdf: base64,
      size: redactedBytes.byteLength,
    });
  } catch (error) {
    console.error("Redact error:", error);
    return NextResponse.json(
      { error: "Failed to redact PDF" },
      { status: 500 }
    );
  }
}

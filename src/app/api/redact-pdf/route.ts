import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const redactionLabel = "[retracted]";

    // For each match, find overlapping text positions and stamp a visible replacement.
    for (const match of matches) {
      const overlapping = positions.filter(
        (pos) => pos.charStart < match.end && pos.charEnd > match.start
      );
      const byPage = new Map<number, TextPosition[]>();

      for (const pos of overlapping) {
        byPage.set(pos.pageIndex, [...(byPage.get(pos.pageIndex) || []), pos]);
      }

      for (const [pageIndex, pagePositions] of byPage.entries()) {
        const page = pages[pageIndex];
        if (!page || pagePositions.length === 0) continue;

        const padding = 2;
        const left = Math.min(...pagePositions.map((pos) => pos.x)) - padding;
        const bottom = Math.min(...pagePositions.map((pos) => pos.y)) - padding;
        const right =
          Math.max(...pagePositions.map((pos) => pos.x + pos.width)) + padding;
        const top =
          Math.max(...pagePositions.map((pos) => pos.y + pos.height)) + padding;
        const width = Math.max(1, right - left);
        const height = Math.max(1, top - bottom);
        const fontSize = Math.max(7, Math.min(10, height * 0.55));

        page.drawRectangle({
          x: left,
          y: bottom,
          width,
          height,
          color: rgb(1, 0.97, 0.92),
          borderColor: rgb(0.95, 0.45, 0.1),
          borderWidth: 0.5,
        });
        page.drawText(redactionLabel, {
          x: left + 2,
          y: bottom + Math.max(1, (height - fontSize) / 2),
          size: fontSize,
          font,
          color: rgb(0.45, 0.16, 0.07),
          maxWidth: Math.max(1, width - 4),
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

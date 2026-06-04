// Helper to extract text from PDF using pdfjs-dist legacy build
// Returns text and position metadata for redaction

export interface TextPosition {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  // Character offset in the full concatenated text
  charStart: number;
  charEnd: number;
}

export interface PdfExtractResult {
  text: string;
  positions: TextPosition[];
  pageCount: number;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await extractPdfWithPositions(buffer);
  return result.text;
}

export async function extractPdfWithPositions(buffer: Buffer): Promise<PdfExtractResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const positions: TextPosition[] = [];
  let fullText = "";

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of content.items) {
      if (!item.str) continue;

      // item.transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0]);
      const width = item.width;
      const height = fontSize;

      // PDF coordinates: origin at bottom-left
      // Convert to top-left origin for pdf-lib (which also uses bottom-left, so keep as-is)
      const charStart = fullText.length;
      fullText += item.str;
      const charEnd = fullText.length;

      positions.push({
        text: item.str,
        x: tx,
        y: ty,
        width: width,
        height: height,
        pageIndex: i - 1,
        charStart,
        charEnd,
      });
    }

    // Add space between items from same page, newline between pages
    if (i < doc.numPages) {
      fullText += "\n";
    }
  }

  return {
    text: fullText,
    positions,
    pageCount: doc.numPages,
  };
}

/**
 * Text from a PDF, read on the device (D107): the file never leaves it. pdfjs-dist loads only when a student picks a
 * PDF, never in the first download. Lines are joined into paragraphs where the gap between lines is larger than usual;
 * a scanned PDF has no text layer and comes back empty (reading images needs OCR, not in this version).
 */
export async function pdfText(file: File, maxPages = 30): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const out: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
    const page = await doc.getPage(n);
    const items = (await page.getTextContent()).items as { str: string; transform: number[]; height: number; hasEOL?: boolean }[];
    let line = "", lastY: number | null = null, gap = 0;
    const lines: { text: string; gapBefore: number }[] = [];
    for (const it of items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 1) {
        lines.push({ text: line.trim(), gapBefore: gap });
        gap = Math.abs(lastY - y);
        line = "";
      }
      line += it.str + (it.hasEOL ? " " : "");
      lastY = y;
    }
    if (line.trim()) lines.push({ text: line.trim(), gapBefore: gap });
    // The usual line gap is the most common one; a clearly larger gap starts a new paragraph.
    const gaps = lines.map((l) => Math.round(l.gapBefore)).filter((g) => g > 0).sort((a, b) => a - b);
    const usual = gaps[Math.floor(gaps.length / 2)] ?? 12;
    lines.forEach((l, i) => out.push((i > 0 && l.gapBefore > usual * 1.4 ? "\n" : "") + l.text));
    out.push("\n");
  }
  await task.destroy();
  return out.join("\n");
}

import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { PDFFile } from "@/types/pdf";

const NOTE_COLOR_NAMES: Record<string, string> = {
  "#FFEB3B": "Yellow",
  "#4CAF50": "Green",
  "#60A5FA": "Blue",
  "#FF80AB": "Pink",
  "#FF8A65": "Orange",
  "#2196F3": "Blue",
  "#FF5252": "Red",
};

function colorName(hex: string) {
  return NOTE_COLOR_NAMES[hex.toUpperCase()] ?? NOTE_COLOR_NAMES[hex] ?? "Note";
}

function buildSummaryText(file: PDFFile): string {
  const notes = Object.values(file.notes).sort((a, b) => a.page - b.page);
  const annotPages = Object.keys(file.annotations)
    .map(Number)
    .sort((a, b) => a - b);

  const lines: string[] = [];
  lines.push(`📄 ${file.name}`);
  lines.push(`Pages: ${file.pageCount || "?"} · Last read: page ${file.lastPage}`);
  lines.push("");

  if (notes.length > 0) {
    lines.push(`── Sticky Notes (${notes.length}) ──`);
    notes.forEach((n) => {
      lines.push(`Page ${n.page} [${colorName(n.color)}]`);
      lines.push(`  ${n.text}`);
    });
    lines.push("");
  }

  if (annotPages.length > 0) {
    lines.push(`── Drawing Annotations ──`);
    lines.push(`Pages with ink: ${annotPages.join(", ")}`);
    lines.push("");
  }

  if (notes.length === 0 && annotPages.length === 0) {
    lines.push("No annotations yet.");
  }

  lines.push(`Exported from PDF Reader · ${new Date().toLocaleDateString()}`);
  return lines.join("\n");
}

function buildSummaryHtml(file: PDFFile): string {
  const notes = Object.values(file.notes).sort((a, b) => a.page - b.page);
  const annotPages = Object.keys(file.annotations)
    .map(Number)
    .sort((a, b) => a - b);

  const noteRows = notes
    .map(
      (n) => `
      <div class="note-card" style="border-left: 4px solid ${n.color};">
        <div class="note-meta">Page ${n.page} &nbsp;·&nbsp; <span class="chip" style="background:${n.color}22;color:${n.color === "#FFEB3B" ? "#92700a" : n.color}">${colorName(n.color)}</span></div>
        <div class="note-text">${n.text.replace(/\n/g, "<br>")}</div>
      </div>`
    )
    .join("");

  const inkSection =
    annotPages.length > 0
      ? `<section>
          <h2>Drawing Annotations</h2>
          <p>The following pages contain ink annotations: <strong>${annotPages.join(", ")}</strong></p>
        </section>`
      : "";

  const noAnnots =
    notes.length === 0 && annotPages.length === 0
      ? `<p style="color:#888;font-style:italic">No annotations added yet.</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; background: #f8f9fa; padding: 32px 24px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 28px; }
  h2 { font-size: 15px; font-weight: 600; color: #444; margin-bottom: 14px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  section { margin-bottom: 28px; }
  .note-card { background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .note-meta { font-size: 12px; color: #888; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .chip { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
  .note-text { font-size: 14px; line-height: 1.55; color: #2d2d2d; white-space: pre-wrap; }
  footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: 12px; }
</style>
</head>
<body>
  <h1>${file.name.replace(/\.pdf$/i, "")}</h1>
  <p class="meta">
    ${file.pageCount ? `${file.pageCount} pages &nbsp;·&nbsp;` : ""}Last read: page ${file.lastPage} &nbsp;·&nbsp; Exported ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
  </p>

  ${noAnnots}

  ${
    notes.length > 0
      ? `<section>
      <h2>Sticky Notes (${notes.length})</h2>
      ${noteRows}
    </section>`
      : ""
  }

  ${inkSection}

  <footer>Exported from PDF Reader</footer>
</body>
</html>`;
}

export async function sharePdfFile(file: PDFFile): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    dialogTitle: `Share ${file.name}`,
    UTI: "com.adobe.pdf",
  });
}

export async function copyAnnotationSummary(file: PDFFile): Promise<void> {
  const text = buildSummaryText(file);
  await Clipboard.setStringAsync(text);
}

export async function exportAnnotationPdf(file: PDFFile): Promise<void> {
  const html = buildSummaryHtml(file);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export Annotation Summary",
    UTI: "com.adobe.pdf",
  });
}

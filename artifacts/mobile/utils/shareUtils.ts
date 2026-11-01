import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { PDFFile } from "@/types/pdf";
import {
  annotatedPageNumbers,
  escapeHtml,
  flattenAnnotatedPdf,
  hasBurnableEdits,
  markupTextLines,
} from "@/utils/flattenPdf";
import { uint8ToBase64 } from "@/utils/files";

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

async function readPdfBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("/")) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Could not read the PDF (" + response.status + ").");
    return new Uint8Array(await response.arrayBuffer());
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildSummaryText(file: PDFFile): string {
  const notes = Object.values(file.notes ?? {}).sort((a, b) => a.page - b.page);
  const annotPages = annotatedPageNumbers(file);
  const written = markupTextLines(file);
  const lines: string[] = [];
  lines.push(file.name);
  lines.push(`Pages: ${file.pageCount || "?"} · Last read: page ${file.lastPage}`);
  lines.push("");
  if (notes.length > 0) {
    lines.push(`Sticky notes (${notes.length})`);
    notes.forEach((note) => {
      lines.push(`Page ${note.page} [${colorName(note.color)}]`);
      lines.push(`  ${note.text}`);
    });
    lines.push("");
  }
  if (written.length > 0) {
    lines.push("Text and stamps");
    written.forEach((line) => lines.push(`  ${line}`));
    lines.push("");
  }
  if (annotPages.length > 0) {
    lines.push(`Marked pages: ${annotPages.join(", ")}`);
    lines.push("");
  }
  if (notes.length === 0 && written.length === 0 && annotPages.length === 0) {
    lines.push("No annotations yet.");
  }
  lines.push(`Exported from PDF Reader · ${new Date().toLocaleDateString()}`);
  return lines.join("\n");
}

function buildSummaryHtml(file: PDFFile): string {
  const notes = Object.values(file.notes ?? {}).sort((a, b) => a.page - b.page);
  const annotPages = annotatedPageNumbers(file);
  const written = markupTextLines(file);
  const safeName = escapeHtml(file.name.replace(/\.pdf$/i, ""));
  const noteRows = notes
    .map((note) => {
      const safeText = escapeHtml(note.text);
      const safeColor = escapeHtml(note.color);
      return `<div class="note-card" style="border-left: 4px solid ${safeColor};">
        <div class="note-meta">Page ${note.page} · ${escapeHtml(colorName(note.color))}</div>
        <div class="note-text">${safeText.replace(/\n/g, "<br>")}</div>
      </div>`;
    })
    .join("");
  const writtenSection =
    written.length > 0
      ? `<section><h2>Text and stamps</h2><ul>${written
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</ul></section>`
      : "";
  const inkSection =
    annotPages.length > 0
      ? `<section><h2>Marked pages</h2><p>${escapeHtml(annotPages.join(", "))}</p></section>`
      : "";
  const noAnnots =
    notes.length === 0 && written.length === 0 && annotPages.length === 0
      ? `<p style="color:#888;font-style:italic">No annotations added yet.</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; padding: 32px 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 28px; }
  h2 { font-size: 15px; margin-bottom: 12px; }
  .note-card { background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  .note-meta { font-size: 12px; color: #888; margin-bottom: 6px; }
  .note-text { font-size: 14px; line-height: 1.55; }
</style>
</head>
<body>
  <h1>${safeName}</h1>
  <p class="meta">Last read: page ${file.lastPage}</p>
  ${noAnnots}
  ${notes.length > 0 ? `<section><h2>Sticky notes (${notes.length})</h2>${noteRows}</section>` : ""}
  ${writtenSection}
  ${inkSection}
</body>
</html>`;
}

async function shareBytes(bytes: Uint8Array, fileName: string): Promise<void> {
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
  const root = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!root) {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeName;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    throw new Error("Sharing is not available on this device.");
  }
  const dest = root + safeName;
  await FileSystem.writeAsStringAsync(dest, uint8ToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(dest, {
    mimeType: "application/pdf",
    dialogTitle: `Share ${fileName}`,
    UTI: "com.adobe.pdf",
  });
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

export async function shareAnnotatedPdf(file: PDFFile): Promise<void> {
  if (!hasBurnableEdits(file)) {
    await sharePdfFile(file);
    return;
  }
  const bytes = await readPdfBytes(file.uri);
  const flattened = await flattenAnnotatedPdf(bytes, file);
  const name = file.name.replace(/\.pdf$/i, "") + " annotated.pdf";
  await shareBytes(flattened, name);
}

export async function copyAnnotationSummary(file: PDFFile): Promise<void> {
  await Clipboard.setStringAsync(buildSummaryText(file));
}

export async function exportAnnotationPdf(file: PDFFile): Promise<void> {
  const html = buildSummaryHtml(file);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export annotation summary",
    UTI: "com.adobe.pdf",
  });
}

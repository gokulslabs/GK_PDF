import Clipboard from "@react-native-clipboard/clipboard";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Platform } from "react-native";
import Share from "react-native-share";

import { PDFFile } from "@/types/pdf";
import { base64ToUint8, uint8ToBase64 } from "@/utils/base64";
import { cacheDirectory, readFileBase64, writeFileBase64 } from "@/utils/files";
import {
  annotatedPageNumbers,
  flattenAnnotatedPdf,
  hasBurnableEdits,
  markupTextLines,
  pdfSafe,
} from "@/utils/flattenPdf";

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
  return base64ToUint8(await readFileBase64(uri));
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

function wrapLine(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function summaryPdfBytes(file: PDFFile): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const margin = 48;
  const fontSize = 11;
  const lineHeight = 15;
  const maxChars = 85;
  const lines = buildSummaryText(file)
    .split("\n")
    .flatMap((line) => wrapLine(pdfSafe(line), maxChars));

  let page = doc.addPage();
  let y = page.getHeight() - margin;
  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage();
      y = page.getHeight() - margin;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.16),
    });
    y -= lineHeight;
  }
  return doc.save();
}

function isShareCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /did not share|user cancelled|user canceled|cancel/i.test(message);
}

async function shareBytes(bytes: Uint8Array, fileName: string): Promise<void> {
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
  const root = cacheDirectory();
  if (!root) throw new Error("Sharing is not available on this device.");
  const dest = `${root}/${safeName}`;
  await writeFileBase64(dest, uint8ToBase64(bytes));
  await sharePath(dest, safeName);
}

async function sharePath(path: string, fileName: string): Promise<void> {
  const url = path.startsWith("file://")
    ? path
    : Platform.OS === "android"
      ? `file://${path}`
      : path;
  try {
    await Share.open({
      url,
      type: "application/pdf",
      filename: fileName,
      failOnCancel: false,
      title: fileName,
    });
  } catch (error) {
    if (isShareCancel(error)) return;
    throw error;
  }
}

export async function sharePdfFile(file: PDFFile): Promise<void> {
  await sharePath(file.uri, file.name);
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
  Clipboard.setString(buildSummaryText(file));
}

export async function exportAnnotationPdf(file: PDFFile): Promise<void> {
  const bytes = await summaryPdfBytes(file);
  const name = file.name.replace(/\.pdf$/i, "") + " notes.pdf";
  await shareBytes(bytes, name);
}

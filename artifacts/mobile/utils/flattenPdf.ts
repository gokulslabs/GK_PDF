import {
  BlendMode,
  LineCapStyle,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFFont,
  PDFPage,
  PDFRadioGroup,
  PDFTextField,
  RGB,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { MarkupOp, PDFFile, PdfRect, StampType, StickyNote } from "@/types/pdf";

const STAMPS: Record<StampType, { label: string; rgb: [number, number, number] }> = {
  approved: { label: "APPROVED", rgb: [0.086, 0.639, 0.29] },
  draft: { label: "DRAFT", rgb: [0.145, 0.388, 0.922] },
  confidential: { label: "CONFIDENTIAL", rgb: [0.863, 0.149, 0.149] },
  reviewed: { label: "REVIEWED", rgb: [0.486, 0.227, 0.929] },
  urgent: { label: "URGENT", rgb: [0.918, 0.345, 0.047] },
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pdfSafe(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[^\x20-\x7E]/g, "?").trim();
}

export function hasBurnableEdits(file: PDFFile): boolean {
  if (Object.keys(file.formValues ?? {}).length > 0) return true;
  if (Object.keys(file.annotations ?? {}).length > 0) return true;
  if (Object.keys(file.notes ?? {}).length > 0) return true;
  return Object.values(file.markup ?? {}).some((ops) => ops && ops.length > 0);
}

export function annotatedPageNumbers(file: PDFFile): number[] {
  const pages = new Set<number>();
  for (const [page, ops] of Object.entries(file.markup ?? {})) {
    if (ops?.length) pages.add(Number(page));
  }
  for (const page of Object.keys(file.annotations ?? {})) pages.add(Number(page));
  for (const note of Object.values(file.notes ?? {})) pages.add(note.page);
  return [...pages].sort((a, b) => a - b);
}

function colorOf(hex: string): RGB {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return rgb(0.1, 0.1, 0.1);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function rectBox(rect: PdfRect) {
  return {
    x: Math.min(rect.x1, rect.x2),
    y: Math.min(rect.y1, rect.y2),
    width: Math.abs(rect.x2 - rect.x1),
    height: Math.abs(rect.y2 - rect.y1),
  };
}

function drawShape(page: PDFPage, op: Extract<MarkupOp, { type: "shape" }>, color: RGB) {
  const x1 = op.x1;
  const y1 = op.y1;
  const x2 = op.x2;
  const y2 = op.y2;
  if (op.shape === "line" || op.shape === "arrow") {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1.6,
      color,
      lineCap: LineCapStyle.Round,
    });
    if (op.shape === "arrow") drawArrowHead(page, x1, y1, x2, y2, color);
    return;
  }
  if (op.shape === "rect") {
    page.drawRectangle({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      borderColor: color,
      borderWidth: 1.6,
    });
    return;
  }
  page.drawEllipse({
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    xScale: Math.max(Math.abs(x2 - x1) / 2, 1),
    yScale: Math.max(Math.abs(y2 - y1) / 2, 1),
    borderColor: color,
    borderWidth: 1.6,
  });
}

function drawArrowHead(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = 14;
  const wing = 6;
  page.drawLine({
    start: { x: x2, y: y2 },
    end: { x: x2 - ux * head + uy * wing, y: y2 - uy * head - ux * wing },
    thickness: 1.6,
    color,
  });
  page.drawLine({
    start: { x: x2, y: y2 },
    end: { x: x2 - ux * head - uy * wing, y: y2 - uy * head + ux * wing },
    thickness: 1.6,
    color,
  });
}

function drawOp(page: PDFPage, op: MarkupOp, font: PDFFont) {
  if (op.type === "stroke") {
    const color = colorOf(op.color);
    for (let i = 1; i < op.points.length; i++) {
      page.drawLine({
        start: op.points[i - 1],
        end: op.points[i],
        thickness: Math.max(0.6, op.width),
        color,
        lineCap: LineCapStyle.Round,
      });
    }
    return;
  }
  if (op.type === "highlight" || op.type === "underline" || op.type === "strike") {
    const color = colorOf(op.color);
    for (const rect of op.rects) {
      const box = rectBox(rect);
      if (op.type === "highlight") {
        page.drawRectangle({
          ...box,
          color,
          opacity: 0.35,
          blendMode: BlendMode.Multiply,
        });
      } else {
        const y = op.type === "underline" ? box.y : box.y + box.height * 0.45;
        page.drawLine({
          start: { x: box.x, y },
          end: { x: box.x + box.width, y },
          thickness: 1.4,
          color,
        });
      }
    }
    return;
  }
  if (op.type === "shape") {
    drawShape(page, op, colorOf(op.color));
    return;
  }
  if (op.type === "stamp") {
    const def = STAMPS[op.stamp] ?? STAMPS.draft;
    const color = rgb(def.rgb[0], def.rgb[1], def.rgb[2]);
    page.drawRectangle({
      x: op.x - op.w / 2,
      y: op.y - op.h / 2,
      width: op.w,
      height: op.h,
      borderColor: color,
      borderWidth: 1.5,
      opacity: 0.9,
    });
    const size = Math.max(8, Math.min(op.h * 0.42, 16));
    const label = def.label;
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: op.x - textWidth / 2,
      y: op.y - size / 3,
      size,
      font,
      color,
    });
    return;
  }
  if (op.type !== "text") return;
  const text = pdfSafe(op.text);
  if (!text) return;
  page.drawText(text, {
    x: op.x,
    y: op.y,
    size: Math.max(6, op.size),
    font,
    color: colorOf(op.color),
  });
}

function notePoint(note: StickyNote, width: number, height: number) {
  if (typeof note.pdfX === "number" && typeof note.pdfY === "number") {
    return { x: note.pdfX, y: note.pdfY };
  }
  return { x: note.x * width, y: (1 - note.y) * height };
}

function drawNote(page: PDFPage, note: StickyNote, font: PDFFont) {
  const { width, height } = page.getSize();
  const point = notePoint(note, width, height);
  const color = colorOf(note.color);
  page.drawCircle({ x: point.x, y: point.y, size: 7, color, borderWidth: 0 });
  const text = pdfSafe(note.text).slice(0, 240);
  if (!text) return;
  page.drawText(text, {
    x: point.x + 12,
    y: point.y - 4,
    size: 10,
    font,
    color: rgb(0.12, 0.12, 0.12),
  });
}

async function drawLegacy(pdf: PDFDocument, page: PDFPage, dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return;
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const image =
    match[1].toLowerCase() === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const { width, height } = page.getSize();
  page.drawImage(image, { x: 0, y: 0, width, height });
}

function applyFormValues(pdf: PDFDocument, values: Record<string, string>, font: PDFFont) {
  let form;
  try {
    form = pdf.getForm();
  } catch {
    return;
  }
  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) field.setText(value);
      else if (field instanceof PDFCheckBox) {
        if (value && value !== "Off" && value !== "false") field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown) field.select(value);
      else if (field instanceof PDFRadioGroup) field.select(value);
    } catch {
      // Unknown or unsupported field. Keep exporting the rest.
    }
  }
  try {
    form.updateFieldAppearances(font);
  } catch {
    // Appearance update is optional; values are still stored.
  }
}

export async function flattenAnnotatedPdf(bytes: Uint8Array, file: PDFFile): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/encrypt/i.test(message)) {
      throw new Error("This PDF is encrypted. Share the original file, or remove the password in another app before exporting a marked copy.");
    }
    throw error instanceof Error ? error : new Error(message);
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  for (let index = 0; index < pages.length; index++) {
    const pageNo = index + 1;
    const page = pages[index];
    const legacy = file.annotations?.[pageNo];
    if (legacy) {
      try {
        await drawLegacy(pdf, page, legacy);
      } catch {
        // Skip a corrupt legacy snapshot.
      }
    }
    for (const op of file.markup?.[pageNo] ?? []) {
      try {
        drawOp(page, op, font);
      } catch {
        // Skip one bad mark rather than failing the export.
      }
    }
    for (const note of Object.values(file.notes ?? {})) {
      if (note.page !== pageNo) continue;
      try {
        drawNote(page, note, font);
      } catch {
        // Skip a note that the font cannot draw.
      }
    }
  }
  applyFormValues(pdf, file.formValues ?? {}, font);
  return pdf.save();
}

export function markupTextLines(file: PDFFile): string[] {
  const lines: string[] = [];
  const pages = Object.keys(file.markup ?? {})
    .map(Number)
    .sort((a, b) => a - b);
  for (const page of pages) {
    for (const op of file.markup[page] ?? []) {
      if (op.type === "text" && op.text.trim()) lines.push(`Page ${page}: ${op.text.trim()}`);
      else if (op.type === "stamp") lines.push(`Page ${page}: ${STAMPS[op.stamp]?.label ?? op.stamp}`);
    }
  }
  return lines;
}


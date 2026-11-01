import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { describe, test } from "node:test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { PDFFile } from "../types/pdf";
import { escapeHtml, flattenAnnotatedPdf, hasBurnableEdits, pdfSafe } from "./flattenPdf";

function decodePdfText(content: string): string {
  return content.replace(/<([0-9A-Fa-f]+)>/g, (_match, hex: string) =>
    Buffer.from(hex, "hex").toString("latin1")
  );
}

function inflatePdf(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const parts: string[] = [raw];
  const pattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    const slice = pdf.subarray(start, end);
    try {
      parts.push(inflateSync(slice).toString("latin1"));
    } catch {
      try {
        parts.push(inflateSync(slice.subarray(0, slice.length - 1)).toString("latin1"));
      } catch {
        // Not a deflated stream.
      }
    }
  }
  return parts.join("\n");
}

async function blankPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 400]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Original", { x: 24, y: 360, size: 18, font, color: rgb(0, 0, 0) });
  return pdf.save();
}

function file(partial: Partial<PDFFile>): PDFFile {
  return {
    id: "doc",
    name: "Notes.pdf",
    uri: "memory://notes.pdf",
    size: 1,
    pageCount: 1,
    lastOpened: 1,
    lastPage: 1,
    createdAt: 1,
    folderId: null,
    isFavorite: false,
    annotations: {},
    markup: {},
    formValues: {},
    notes: {},
    ...partial,
  };
}

describe("flattenAnnotatedPdf", () => {
  test("burns text, highlight, and sticky notes into the copy", async () => {
    const bytes = await blankPdf();
    const doc = file({
      markup: {
        1: [
          { type: "text", text: "HelloMark", x: 40, y: 300, size: 14, color: "#112233" },
          {
            type: "highlight",
            color: "#FFEB3B",
            rects: [{ x1: 30, y1: 280, x2: 160, y2: 296 }],
          },
          {
            type: "stroke",
            color: "#E11D48",
            width: 2,
            points: [
              { x: 40, y: 200 },
              { x: 120, y: 220 },
            ],
          },
        ],
      },
      notes: {
        n1: {
          id: "n1",
          page: 1,
          x: 0.5,
          y: 0.5,
          pdfX: 80,
          pdfY: 120,
          color: "#FFEB3B",
          text: "Margin note",
          createdAt: 1,
        },
      },
    });
    const flat = await flattenAnnotatedPdf(bytes, doc);
    const saved = decodePdfText(inflatePdf(Buffer.from(flat)));
    assert.match(saved, /HelloMark/);
    assert.match(saved, /Margin note/);
    assert.match(saved, /Original/);
  });

  test("reports when there is nothing to burn in", () => {
    assert.equal(hasBurnableEdits(file({})), false);
    assert.equal(hasBurnableEdits(file({ formValues: { Name: "Ada" } })), true);
  });

  test("escapes summary html", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert(1)">`),
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
    assert.equal(pdfSafe("A\u2603B"), "A?B");
  });
});

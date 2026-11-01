import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { createContext, runInContext } from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PDFJS_MAIN, PDFJS_WORKER } from "../vendor/pdfjsSources";

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = join(here, "../assets/sample/HemeOnc_Handbook.pdf");

type PdfjsLib = {
  getDocument: (src: { data: Uint8Array; disableWorker?: boolean }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
      }>;
      destroy: () => Promise<void>;
    }>;
  };
};

function loadPdfjs(): PdfjsLib {
  const sandbox = {
    console,
    globalThis: null as unknown,
    self: null as unknown,
    window: null as unknown,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Uint8Array,
    Uint8ClampedArray,
    ArrayBuffer,
    DataView,
    Promise,
    TextEncoder,
    TextDecoder,
    ReadableStream,
    WritableStream,
    TransformStream,
    URL,
    atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    btoa: (value: string) => Buffer.from(value, "binary").toString("base64"),
    structuredClone,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  const context = createContext(sandbox);
  runInContext(PDFJS_MAIN, context, { filename: "pdf.min.js" });
  runInContext(PDFJS_WORKER, context, { filename: "pdf.worker.min.js" });
  const lib = (sandbox as { pdfjsLib?: PdfjsLib }).pdfjsLib;
  assert.ok(lib, "PDF.js did not publish pdfjsLib");
  assert.ok((sandbox as { pdfjsWorker?: unknown }).pdfjsWorker, "PDF.js worker did not load");
  return lib;
}

describe("read a PDF with the vendored engine", () => {
  test("opens the sample handbook and reads the first page", async () => {
    const bytes = new Uint8Array(readFileSync(samplePath));
    assert.ok(bytes.byteLength > 1_000_000, "sample PDF is missing or truncated");
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");

    const pdfjsLib = loadPdfjs();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    try {
      assert.ok(doc.numPages > 100, `expected a long handbook, got ${doc.numPages} pages`);
      const page = await doc.getPage(1);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str ?? "").join(" ");
      assert.match(text, /Heme|Onc|Handbook|Page/i);
    } finally {
      await doc.destroy();
    }
  });
});

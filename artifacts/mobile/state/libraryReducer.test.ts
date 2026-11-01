import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { MarkupOp, PDFFile, StickyNote } from "../types/pdf";
import {
  createSerialQueue,
  emptyLibrary,
  libraryReducer,
  normalizeFile,
  normalizeLibrary,
} from "./libraryReducer";

function file(partial: Partial<PDFFile> = {}): PDFFile {
  return normalizeFile({
    id: "doc",
    name: "Notes.pdf",
    uri: "file:///docs/notes.pdf",
    ...partial,
  });
}

const textOp: MarkupOp = {
  type: "text",
  color: "#111111",
  x: 10,
  y: 20,
  size: 12,
  text: "Keep me",
};

describe("libraryReducer", () => {
  test("keeps the source address of a file opened from another app", () => {
    const saved = file({ sourceUri: "content://com.google.android.apps.docs.storage/document/1" });
    assert.equal(saved.sourceUri, "content://com.google.android.apps.docs.storage/document/1");
    const again = normalizeFile(saved);
    assert.equal(again.sourceUri, saved.sourceUri);
  });

  test("progress update keeps markup written earlier", () => {
    const start = normalizeLibrary({ files: [file()], folders: [], seeded: true });
    const withMarkup = libraryReducer(start, {
      type: "markup",
      id: "doc",
      page: 2,
      ops: [textOp],
    });
    const withProgress = libraryReducer(withMarkup, {
      type: "progress",
      id: "doc",
      page: 4,
      pageCount: 10,
    });
    assert.equal(withProgress.files[0].lastPage, 4);
    assert.equal(withProgress.files[0].pageCount, 10);
    assert.deepEqual(withProgress.files[0].markup[2], [textOp]);
  });

  test("queued progress cannot clobber a markup save", async () => {
    const queue = createSerialQueue(normalizeLibrary({ files: [file()], folders: [], seeded: true }));
    const markupWrite = queue.run(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const next = libraryReducer(state, { type: "markup", id: "doc", page: 1, ops: [textOp] });
      queue.set(next);
      return next;
    });
    const progressWrite = queue.run(async (state) => {
      const next = libraryReducer(state, { type: "progress", id: "doc", page: 3 });
      queue.set(next);
      return next;
    });
    await markupWrite;
    const saved = await progressWrite;
    assert.equal(saved.files[0].lastPage, 3);
    assert.deepEqual(saved.files[0].markup[1], [textOp]);
  });

  test("clear stays empty and will not be reseeded", () => {
    const start = normalizeLibrary({
      files: [file()],
      folders: [{ id: "f", name: "Work", createdAt: 1 }],
      seeded: false,
    });
    assert.equal(start.seeded, true);
    const cleared = libraryReducer(start, { type: "clear" });
    assert.deepEqual(cleared.files, []);
    assert.deepEqual(cleared.folders, []);
    assert.equal(cleared.seeded, true);
  });

  test("notes and form values survive a later page update", () => {
    const note: StickyNote = {
      id: "n1",
      page: 1,
      x: 0.2,
      y: 0.3,
      pdfX: 40,
      pdfY: 500,
      color: "#FFEB3B",
      text: "Look here",
      createdAt: 1,
    };
    let state = normalizeLibrary({ files: [file()], folders: [], seeded: true });
    state = libraryReducer(state, { type: "addNote", id: "doc", note });
    state = libraryReducer(state, { type: "form", id: "doc", name: "Name", value: "Ada" });
    state = libraryReducer(state, { type: "progress", id: "doc", page: 2 });
    assert.equal(state.files[0].notes.n1.text, "Look here");
    assert.equal(state.files[0].formValues.Name, "Ada");
  });

  test("legacy files without markup still load", () => {
    const hydrated = normalizeLibrary({
      files: [
        {
          id: "old",
          name: "Old.pdf",
          uri: "file:///old.pdf",
          annotations: { 1: "data:image/png;base64,aaaa" },
        } as PDFFile,
      ],
      folders: [],
    });
    assert.deepEqual(hydrated.files[0].markup, {});
    assert.deepEqual(hydrated.files[0].formValues, {});
    assert.match(hydrated.files[0].annotations[1], /data:image\/png/);
    assert.equal(hydrated.seeded, true);
  });

  test("a brand new library is not seeded", () => {
    assert.equal(emptyLibrary().seeded, false);
    assert.equal(normalizeLibrary(null).seeded, false);
  });
});

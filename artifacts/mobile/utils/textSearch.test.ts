import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { findTextMatches, TextBox } from "./textSearch";

const line: TextBox[] = [
  { str: "The", x: 0, y: 20, w: 16, h: 10 },
  { str: "quick", x: 18, y: 20, w: 28, h: 10 },
  { str: "brown", x: 48, y: 20, w: 30, h: 10 },
  { str: "fox", x: 0, y: 4, w: 16, h: 10 },
  { str: "jumps", x: 18, y: 4, w: 30, h: 10 },
];

describe("findTextMatches", () => {
  test("matches a word without returning the rest of the page", () => {
    const hits = findTextMatches(line, "brown");
    assert.deepEqual(hits.map((box) => box.str), ["brown"]);
  });

  test("matches a phrase across adjacent words only", () => {
    const hits = findTextMatches(line, "quick brown");
    assert.deepEqual(hits.map((box) => box.str), ["quick", "brown"]);
  });

  test("does not highlight every word when the phrase is absent", () => {
    assert.deepEqual(findTextMatches(line, "quick fox"), []);
  });

  test("matches a phrase that wraps to the next line", () => {
    const hits = findTextMatches(line, "brown fox");
    assert.deepEqual(hits.map((box) => box.str), ["brown", "fox"]);
  });

  test("ignores blank queries", () => {
    assert.deepEqual(findTextMatches(line, "   "), []);
  });
});

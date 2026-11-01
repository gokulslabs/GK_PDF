export interface TextBox {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Plain function pasted into the PDF webview. Keep it free of closures,
 * helpers, and syntax the page script would not otherwise define.
 */
export const FIND_TEXT_MATCHES_SOURCE = `function findTextMatches(items, query) {
  var q = String(query || "").replace(/^\\s+|\\s+$/g, "").toLowerCase();
  if (!q || !items || !items.length) return [];
  var words = q.split(/\\s+/);
  function norm(s) {
    return String(s || "").toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  }
  if (words.length === 1) {
    var needle = words[0];
    var single = [];
    for (var i = 0; i < items.length; i++) {
      if (norm(items[i].str).indexOf(needle) !== -1 || String(items[i].str).toLowerCase().indexOf(needle) !== -1) {
        single.push(items[i]);
      }
    }
    return single;
  }
  var hits = [];
  var seen = {};
  for (var start = 0; start < items.length; start++) {
    var k = start;
    var rects = [];
    var ok = true;
    for (var w = 0; w < words.length; w++) {
      if (k >= items.length) { ok = false; break; }
      var it = items[k];
      var token = norm(it.str);
      if (token !== words[w] && token.indexOf(words[w]) === -1) { ok = false; break; }
      if (rects.length) {
        var prev = rects[rects.length - 1];
        var prevMid = prev.y + prev.h / 2;
        var mid = it.y + it.h / 2;
        var sameLine = Math.abs(prevMid - mid) < Math.max(prev.h, it.h) * 0.85;
        var lineGap = prev.y - (it.y + it.h);
        var nextLine = it.y < prev.y && lineGap < Math.max(prev.h, it.h) * 1.6;
        if (!sameLine && !nextLine) { ok = false; break; }
      }
      rects.push(it);
      k++;
    }
    if (!ok) continue;
    for (var r = 0; r < rects.length; r++) {
      var key = rects[r].x + ":" + rects[r].y + ":" + rects[r].str;
      if (seen[key]) continue;
      seen[key] = 1;
      hits.push(rects[r]);
    }
  }
  return hits;
}`;

type MatchFn = (items: TextBox[], query: string) => TextBox[];

const findTextMatchesImpl: MatchFn = new Function(
  `${FIND_TEXT_MATCHES_SOURCE}; return findTextMatches;`
)() as MatchFn;

export function findTextMatches(items: TextBox[], query: string): TextBox[] {
  return findTextMatchesImpl(items, query);
}

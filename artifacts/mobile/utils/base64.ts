const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function uint8ToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64_ALPHABET[(triple >> 18) & 63];
    out += BASE64_ALPHABET[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : "=";
  }
  return out;
}

export function base64ToUint8(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const pad = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((clean.length * 3) / 4 - pad);
  let offset = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const n =
      (BASE64_ALPHABET.indexOf(clean[index]) << 18) |
      (BASE64_ALPHABET.indexOf(clean[index + 1]) << 12) |
      ((index + 2 < clean.length ? BASE64_ALPHABET.indexOf(clean[index + 2]) : 0) << 6) |
      (index + 3 < clean.length ? BASE64_ALPHABET.indexOf(clean[index + 3]) : 0);
    if (offset < out.length) out[offset++] = (n >> 16) & 255;
    if (offset < out.length) out[offset++] = (n >> 8) & 255;
    if (offset < out.length) out[offset++] = n & 255;
  }
  return out;
}

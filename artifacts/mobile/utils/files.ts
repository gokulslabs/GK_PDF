import ReactNativeBlobUtil from "react-native-blob-util";

function stripFileScheme(uri: string): string {
  return uri.replace(/^file:\/\//, "");
}

export function documentDirectory(): string {
  return ReactNativeBlobUtil.fs.dirs.DocumentDir;
}

export function cacheDirectory(): string {
  return ReactNativeBlobUtil.fs.dirs.CacheDir;
}

export function pdfsDirectory(): string {
  return `${documentDirectory()}/pdfs`;
}

export async function ensureDir(dir: string): Promise<void> {
  const path = stripFileScheme(dir);
  const exists = await ReactNativeBlobUtil.fs.exists(path);
  if (!exists) await ReactNativeBlobUtil.fs.mkdir(path);
}

export async function readFileBase64(uri: string): Promise<string> {
  return ReactNativeBlobUtil.fs.readFile(stripFileScheme(uri), "base64");
}

export async function writeFileBase64(path: string, base64: string): Promise<void> {
  await ReactNativeBlobUtil.fs.writeFile(stripFileScheme(path), base64, "base64");
}

export async function fileExists(path: string): Promise<boolean> {
  return ReactNativeBlobUtil.fs.exists(stripFileScheme(path));
}

export async function fileSize(path: string): Promise<number> {
  const stat = await ReactNativeBlobUtil.fs.stat(stripFileScheme(path));
  return Number(stat.size) || 0;
}

export async function deleteOwnedPdf(uri: string): Promise<void> {
  const path = stripFileScheme(uri);
  const root = documentDirectory();
  if (!path.startsWith(root)) return;
  try {
    await ReactNativeBlobUtil.fs.unlink(path);
  } catch {
    // The library entry is already gone. A leftover file can be cleaned up later.
  }
}

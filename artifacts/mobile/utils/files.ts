import * as FileSystem from "expo-file-system";

export async function deleteOwnedPdf(uri: string): Promise<void> {
  const root = FileSystem.documentDirectory;
  if (!root || !uri.startsWith(root)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // The library entry is already gone. A leftover file can be cleaned up later.
  }
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    const end = Math.min(index + chunk, bytes.length);
    for (let i = index; i < end; i++) binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

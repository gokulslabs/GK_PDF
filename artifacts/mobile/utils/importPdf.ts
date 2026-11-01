import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from "@react-native-documents/picker";
import ReactNativeBlobUtil from "react-native-blob-util";

import { ensureDir, fileSize, pdfsDirectory } from "@/utils/files";

export interface ImportedPdf {
  name: string;
  uri: string;
  size: number;
}

function decodeFilePath(uri: string): string {
  const path = uri.replace(/^file:\/\//, "");
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

async function copyPdfTo(sourceUri: string, dest: string): Promise<void> {
  const rawPath = sourceUri.replace(/^file:\/\//, "");
  const decodedPath = decodeFilePath(sourceUri);
  const paths = rawPath === decodedPath ? [decodedPath] : [decodedPath, rawPath];
  for (const path of paths) {
    if (path.includes("://")) continue;
    if (await ReactNativeBlobUtil.fs.exists(path)) {
      await ReactNativeBlobUtil.fs.cp(path, dest);
      return;
    }
  }
  await ReactNativeBlobUtil.config({ path: dest }).fetch("GET", sourceUri);
}

export async function importPdfFromPicker(): Promise<ImportedPdf | null> {
  try {
    const [file] = await pick({ type: [types.pdf] });
    const fileName = file.name ?? "document.pdf";
    const [copy] = await keepLocalCopy({
      files: [{ uri: file.uri, fileName: fileName.replace(/[^\w.\- ]+/g, "_") }],
      destination: "cachesDirectory",
    });
    if (copy.status !== "success") {
      throw new Error("Could not copy the selected PDF.");
    }

    const dir = pdfsDirectory();
    await ensureDir(dir);
    const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
    const dest = `${dir}/${Date.now()}_${safeName}`;
    try {
      await copyPdfTo(copy.localUri, dest);
    } catch {
      await copyPdfTo(file.uri, dest);
    }
    if (!(await ReactNativeBlobUtil.fs.exists(dest))) {
      throw new Error("Could not copy the selected PDF.");
    }
    const size = (await fileSize(dest)) || file.size || 0;
    return { name: fileName, uri: dest, size };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
}

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

export async function importPdfFromPicker(): Promise<ImportedPdf | null> {
  try {
    const [file] = await pick({ type: [types.pdf] });
    const fileName = file.name ?? "document.pdf";
    const [copy] = await keepLocalCopy({
      files: [{ uri: file.uri, fileName }],
      destination: "cachesDirectory",
    });
    if (copy.status !== "success") {
      throw new Error("Could not copy the selected PDF.");
    }

    const dir = pdfsDirectory();
    await ensureDir(dir);
    const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
    const dest = `${dir}/${Date.now()}_${safeName}`;
    await ReactNativeBlobUtil.fs.cp(copy.localUri.replace(/^file:\/\//, ""), dest);
    const size = (await fileSize(dest)) || file.size || 0;
    return { name: fileName, uri: dest, size };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
}

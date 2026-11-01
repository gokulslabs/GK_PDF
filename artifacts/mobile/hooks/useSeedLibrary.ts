import { useEffect, useRef, useState } from "react";
import { Image, Platform } from "react-native";
import ReactNativeBlobUtil from "react-native-blob-util";

import { useLibrary } from "@/context/LibraryContext";
import { ensureDir, fileExists, fileSize, pdfsDirectory } from "@/utils/files";

const SAMPLE_NAME = "HemeOnc Handbook 2022–2023.pdf";

export function useSeedLibrary() {
  const { files, loaded, seeded, addFile, markSeeded } = useLibrary();
  const attempted = useRef(false);
  const [seeding, setSeeding] = useState(false);

  // Seed once on a brand new install. Clearing the library sets seeded, so it stays empty.
  useEffect(() => {
    if (!loaded || seeded || files.length > 0 || attempted.current) return;
    attempted.current = true;
    void seed().then((ok) => {
      if (ok) void markSeeded();
      else attempted.current = false;
    });
  }, [loaded, seeded, files.length, markSeeded]);

  async function seed(): Promise<boolean> {
    try {
      setSeeding(true);

      if (Platform.OS === "web") {
        await addFile({
          name: SAMPLE_NAME,
          uri: "/HemeOnc_Handbook.pdf",
          size: 7_400_000,
          pageCount: 0,
          folderId: null,
        });
        return true;
      }

      const dir = pdfsDirectory();
      await ensureDir(dir);
      const dest = `${dir}/HemeOnc_Handbook.pdf`;
      if (!(await fileExists(dest))) {
        const asset = Image.resolveAssetSource(
          // Metro bundles this PDF because assetExts includes "pdf".
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("@/assets/sample/HemeOnc_Handbook.pdf")
        );
        const uri = asset?.uri;
        if (!uri) return false;
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          await ReactNativeBlobUtil.config({ path: dest }).fetch("GET", uri);
        } else {
          await ReactNativeBlobUtil.fs.cp(uri.replace(/^file:\/\//, ""), dest);
        }
      }
      const size = await fileSize(dest);
      await addFile({
        name: SAMPLE_NAME,
        uri: dest,
        size: size || 7_400_000,
        pageCount: 0,
        folderId: null,
      });
      return true;
    } catch (e) {
      console.warn("Demo PDF seed failed:", e);
      return false;
    } finally {
      setSeeding(false);
    }
  }

  return { seeding, seed };
}

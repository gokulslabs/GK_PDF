import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useLibrary } from "@/context/LibraryContext";

export function useSeedLibrary() {
  const { files, loaded, addFile } = useLibrary();
  const attempted = useRef(false);
  const [seeding, setSeeding] = useState(false);

  // Wait until AsyncStorage has finished loading before we decide to seed
  useEffect(() => {
    if (!loaded) return;
    if (attempted.current || files.length > 0) return;
    attempted.current = true;
    seed();
  }, [loaded, files.length]);

  async function seed() {
    try {
      setSeeding(true);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const [asset] = await Asset.loadAsync(
        require("@/assets/sample/HemeOnc_Handbook.pdf")
      );
      await asset.downloadAsync();

      if (Platform.OS === "web") {
        // On web, use the static public file URL — stable across server restarts
        await addFile({
          name: "HemeOnc Handbook 2022–2023.pdf",
          uri: "/HemeOnc_Handbook.pdf",
          size: 7_400_000,
          pageCount: 0,
          folderId: null,
        });
        return;
      }

      // Native: copy to document directory
      const sourceUri = asset.localUri ?? asset.uri;
      if (!sourceUri) return;
      const dir = (FileSystem.documentDirectory ?? "") + "pdfs/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const destUri = dir + "HemeOnc_Handbook.pdf";
      const info = await FileSystem.getInfoAsync(destUri);
      if (!info.exists) {
        await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      }
      const updated = await FileSystem.getInfoAsync(destUri);
      await addFile({
        name: "HemeOnc Handbook 2022–2023.pdf",
        uri: destUri,
        size: (updated as { size?: number }).size ?? 7_400_000,
        pageCount: 0,
        folderId: null,
      });
    } catch (e) {
      console.warn("Demo PDF seed failed:", e);
      attempted.current = false; // allow retry
    } finally {
      setSeeding(false);
    }
  }

  return { seeding, seed };
}

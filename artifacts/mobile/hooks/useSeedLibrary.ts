import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useLibrary } from "@/context/LibraryContext";

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
        return true;
      }

      // Native: copy to document directory
      const sourceUri = asset.localUri ?? asset.uri;
      if (!sourceUri) return false;
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

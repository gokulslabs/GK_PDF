import React, { useCallback, useEffect, useRef } from "react";
import { Alert, NativeEventEmitter, NativeModules } from "react-native";

import { useLibrary } from "@/context/LibraryContext";
import { navigationRef } from "@/navigation/navigationRef";

interface IncomingPdf {
  path: string;
  name: string;
  sourceUri: string;
  size: number;
}

const native = NativeModules.IncomingPdf as
  | { take: () => Promise<IncomingPdf | null> }
  | undefined;

export default function OpenIncomingPdf() {
  const { files, loaded, addFile } = useLibrary();
  const filesRef = useRef(files);
  filesRef.current = files;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const pending = useRef<IncomingPdf | null>(null);
  const opening = useRef(false);

  const open = useCallback(async (incoming: IncomingPdf) => {
    if (!loadedRef.current) {
      pending.current = incoming;
      return;
    }
    if (opening.current) {
      pending.current = incoming;
      return;
    }
    opening.current = true;
    try {
      const existing = filesRef.current.find((file) => file.sourceUri === incoming.sourceUri);
      const id = existing
        ? existing.id
        : await addFile({
            name: incoming.name,
            uri: incoming.path.replace(/^file:\/\//, ""),
            sourceUri: incoming.sourceUri,
            size: incoming.size,
            pageCount: 0,
            folderId: null,
          });
      if (navigationRef.isReady()) navigationRef.navigate("Viewer", { id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open this PDF";
      Alert.alert("Could not open PDF", message);
    } finally {
      opening.current = false;
      const next = pending.current;
      if (next && next.sourceUri !== incoming.sourceUri) {
        pending.current = null;
        void open(next);
      } else {
        pending.current = null;
      }
    }
  }, [addFile]);

  useEffect(() => {
    if (!loaded || !pending.current || opening.current) return;
    const next = pending.current;
    pending.current = null;
    void open(next);
  }, [loaded, open]);

  useEffect(() => {
    if (!native) return;
    const emitter = new NativeEventEmitter(NativeModules.IncomingPdf);
    const subscription = emitter.addListener("IncomingPdf", (payload: IncomingPdf) => {
      if (payload?.path) void open(payload);
    });
    void native.take().then((payload) => {
      if (payload?.path) void open(payload);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not open this PDF";
      Alert.alert("Could not open PDF", message);
    });
    return () => subscription.remove();
  }, [open]);

  return null;
}

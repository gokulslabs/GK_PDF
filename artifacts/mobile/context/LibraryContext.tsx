import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  createSerialQueue,
  emptyLibrary,
  libraryReducer,
  LibraryData,
  normalizeLibrary,
} from "@/state/libraryReducer";
import { Folder, MarkupOp, PDFFile, StickyNote } from "@/types/pdf";
import { deleteOwnedPdf } from "@/utils/files";

interface LibraryContextType {
  files: PDFFile[];
  folders: Folder[];
  loaded: boolean;
  seeded: boolean;
  addFile: (
    data: Omit<
      PDFFile,
      | "id"
      | "createdAt"
      | "lastOpened"
      | "isFavorite"
      | "annotations"
      | "markup"
      | "formValues"
      | "lastPage"
      | "notes"
    >
  ) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateProgress: (id: string, page: number, pageCount?: number) => Promise<void>;
  saveMarkup: (fileId: string, page: number, ops: MarkupOp[]) => Promise<void>;
  saveFormValue: (fileId: string, name: string, value: string) => Promise<void>;
  addNote: (fileId: string, note: StickyNote) => Promise<void>;
  updateNote: (fileId: string, noteId: string, text: string, color: string) => Promise<void>;
  deleteNote: (fileId: string, noteId: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  markSeeded: () => Promise<void>;
  getFileById: (id: string) => PDFFile | undefined;
}

const LibraryContext = createContext<LibraryContextType | null>(null);
const STORAGE_KEY = "@pdf_library_v1";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const queue = useRef(createSerialQueue<LibraryData>(emptyLibrary()));
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const publish = useCallback(async (next: LibraryData) => {
    queue.current.set(next);
    setFiles(next.files);
    setFolders(next.folders);
    setSeeded(next.seeded);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    void queue.current.run(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<LibraryData>) : emptyLibrary();
        let data = normalizeLibrary(parsed);
        if (Platform.OS === "web") {
          data = {
            ...data,
            files: data.files.map((file) =>
              file.name.includes("HemeOnc") && file.uri !== "/HemeOnc_Handbook.pdf"
                ? { ...file, uri: "/HemeOnc_Handbook.pdf" }
                : file
            ),
          };
        }
        await publish(data);
      } catch {
        await publish(emptyLibrary());
      }
      setLoaded(true);
    });
  }, [publish]);

  const addFile = useCallback(
    async (
      data: Omit<
        PDFFile,
        | "id"
        | "createdAt"
        | "lastOpened"
        | "isFavorite"
        | "annotations"
        | "markup"
        | "formValues"
        | "lastPage"
        | "notes"
      >
    ) => {
      const file: PDFFile = {
        ...data,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        createdAt: Date.now(),
        lastOpened: Date.now(),
        lastPage: 1,
        isFavorite: false,
        annotations: {},
        markup: {},
        formValues: {},
        notes: {},
      };
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "add", file }));
      });
    },
    [publish]
  );

  const removeFile = useCallback(
    async (id: string) => {
      await queue.current.run(async (state) => {
        const existing = state.files.find((file) => file.id === id);
        await publish(libraryReducer(state, { type: "remove", id }));
        if (existing) await deleteOwnedPdf(existing.uri);
      });
    },
    [publish]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "toggleFavorite", id }));
      });
    },
    [publish]
  );

  const updateProgress = useCallback(
    async (id: string, page: number, pageCount?: number) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "progress", id, page, pageCount }));
      });
    },
    [publish]
  );

  const saveMarkup = useCallback(
    async (fileId: string, page: number, ops: MarkupOp[]) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "markup", id: fileId, page, ops }));
      });
    },
    [publish]
  );

  const saveFormValue = useCallback(
    async (fileId: string, name: string, value: string) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "form", id: fileId, name, value }));
      });
    },
    [publish]
  );

  const addNote = useCallback(
    async (fileId: string, note: StickyNote) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "addNote", id: fileId, note }));
      });
    },
    [publish]
  );

  const updateNote = useCallback(
    async (fileId: string, noteId: string, text: string, color: string) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "updateNote", id: fileId, noteId, text, color }));
      });
    },
    [publish]
  );

  const deleteNote = useCallback(
    async (fileId: string, noteId: string) => {
      await queue.current.run(async (state) => {
        await publish(libraryReducer(state, { type: "deleteNote", id: fileId, noteId }));
      });
    },
    [publish]
  );

  const clearLibrary = useCallback(async () => {
    await queue.current.run(async (state) => {
      const uris = state.files.map((file) => file.uri);
      await publish(libraryReducer(state, { type: "clear" }));
      await Promise.all(uris.map((uri) => deleteOwnedPdf(uri)));
    });
  }, [publish]);

  const markSeeded = useCallback(async () => {
    await queue.current.run(async (state) => {
      if (state.seeded) return;
      await publish(libraryReducer(state, { type: "markSeeded" }));
    });
  }, [publish]);

  const getFileById = useCallback(
    (id: string) => files.find((file) => file.id === id),
    [files]
  );

  return (
    <LibraryContext.Provider
      value={{
        files,
        folders,
        loaded,
        seeded,
        addFile,
        removeFile,
        toggleFavorite,
        updateProgress,
        saveMarkup,
        saveFormValue,
        addNote,
        updateNote,
        deleteNote,
        clearLibrary,
        markSeeded,
        getFileById,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { Folder, PDFFile, StickyNote } from "@/types/pdf";

interface LibraryContextType {
  files: PDFFile[];
  folders: Folder[];
  loaded: boolean;
  addFile: (
    data: Omit<PDFFile, "id" | "createdAt" | "lastOpened" | "isFavorite" | "annotations" | "lastPage" | "notes">
  ) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateProgress: (id: string, page: number, pageCount?: number) => Promise<void>;
  saveAnnotation: (fileId: string, page: number, imageData: string) => Promise<void>;
  addNote: (fileId: string, note: StickyNote) => Promise<void>;
  updateNote: (fileId: string, noteId: string, text: string, color: string) => Promise<void>;
  deleteNote: (fileId: string, noteId: string) => Promise<void>;
  getFileById: (id: string) => PDFFile | undefined;
}

const LibraryContext = createContext<LibraryContextType | null>(null);
const STORAGE_KEY = "@pdf_library_v1";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        let parsed: PDFFile[] = (data.files || []).map((f: PDFFile) => ({
          ...f,
          notes: f.notes ?? {},
        }));
        // Migration: fix demo PDF URIs stored with old expo-asset hashed URLs
        if (Platform.OS === "web") {
          parsed = parsed.map((f) =>
            f.name.includes("HemeOnc") && f.uri !== "/HemeOnc_Handbook.pdf"
              ? { ...f, uri: "/HemeOnc_Handbook.pdf" }
              : f
          );
        }
        setFiles(parsed);
        setFolders(data.folders || []);
      }
    } catch (_) {}
    setLoaded(true);
  }

  async function persist(nextFiles: PDFFile[], nextFolders: Folder[] = folders) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ files: nextFiles, folders: nextFolders })
    );
  }

  const addFile = useCallback(
    async (
      data: Omit<PDFFile, "id" | "createdAt" | "lastOpened" | "isFavorite" | "annotations" | "lastPage" | "notes">
    ) => {
      const file: PDFFile = {
        ...data,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        createdAt: Date.now(),
        lastOpened: Date.now(),
        lastPage: 1,
        isFavorite: false,
        annotations: {},
        notes: {},
      };
      const next = [file, ...files];
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const removeFile = useCallback(
    async (id: string) => {
      const next = files.filter((f) => f.id !== id);
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const next = files.map((f) =>
        f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
      );
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const updateProgress = useCallback(
    async (id: string, page: number, pageCount?: number) => {
      const next = files.map((f) =>
        f.id === id
          ? { ...f, lastPage: page, lastOpened: Date.now(), ...(pageCount != null ? { pageCount } : {}) }
          : f
      );
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const saveAnnotation = useCallback(
    async (fileId: string, page: number, imageData: string) => {
      const next = files.map((f) =>
        f.id === fileId
          ? { ...f, annotations: { ...f.annotations, [page]: imageData } }
          : f
      );
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const addNote = useCallback(
    async (fileId: string, note: StickyNote) => {
      const next = files.map((f) =>
        f.id === fileId
          ? { ...f, notes: { ...f.notes, [note.id]: note } }
          : f
      );
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const updateNote = useCallback(
    async (fileId: string, noteId: string, text: string, color: string) => {
      const next = files.map((f) => {
        if (f.id !== fileId || !f.notes[noteId]) return f;
        return {
          ...f,
          notes: { ...f.notes, [noteId]: { ...f.notes[noteId], text, color } },
        };
      });
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const deleteNote = useCallback(
    async (fileId: string, noteId: string) => {
      const next = files.map((f) => {
        if (f.id !== fileId) return f;
        const { [noteId]: _removed, ...rest } = f.notes;
        return { ...f, notes: rest };
      });
      setFiles(next);
      await persist(next);
    },
    [files, folders]
  );

  const getFileById = useCallback(
    (id: string) => files.find((f) => f.id === id),
    [files]
  );

  return (
    <LibraryContext.Provider
      value={{
        files,
        folders,
        loaded,
        addFile,
        removeFile,
        toggleFavorite,
        updateProgress,
        saveAnnotation,
        addNote,
        updateNote,
        deleteNote,
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

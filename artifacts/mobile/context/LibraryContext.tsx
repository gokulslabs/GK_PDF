import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Folder, PDFFile } from "@/types/pdf";

interface LibraryContextType {
  files: PDFFile[];
  folders: Folder[];
  addFile: (
    data: Omit<PDFFile, "id" | "createdAt" | "lastOpened" | "isFavorite" | "annotations" | "lastPage">
  ) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateProgress: (id: string, page: number, pageCount?: number) => Promise<void>;
  saveAnnotation: (fileId: string, page: number, imageData: string) => Promise<void>;
  getFileById: (id: string) => PDFFile | undefined;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

const STORAGE_KEY = "@pdf_library_v1";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setFiles(data.files || []);
        setFolders(data.folders || []);
      }
    } catch (_) {}
  }

  async function persist(newFiles: PDFFile[], newFolders: Folder[] = folders) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ files: newFiles, folders: newFolders })
    );
  }

  const addFile = useCallback(
    async (
      data: Omit<PDFFile, "id" | "createdAt" | "lastOpened" | "isFavorite" | "annotations" | "lastPage">
    ) => {
      const file: PDFFile = {
        ...data,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        createdAt: Date.now(),
        lastOpened: Date.now(),
        lastPage: 1,
        isFavorite: false,
        annotations: {},
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
          ? {
              ...f,
              lastPage: page,
              lastOpened: Date.now(),
              ...(pageCount != null ? { pageCount } : {}),
            }
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

  const getFileById = useCallback(
    (id: string) => files.find((f) => f.id === id),
    [files]
  );

  return (
    <LibraryContext.Provider
      value={{
        files,
        folders,
        addFile,
        removeFile,
        toggleFavorite,
        updateProgress,
        saveAnnotation,
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

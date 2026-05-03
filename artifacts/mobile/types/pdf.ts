export interface PDFFile {
  id: string;
  name: string;
  uri: string;
  size: number;
  pageCount: number;
  lastOpened: number;
  lastPage: number;
  createdAt: number;
  folderId: string | null;
  isFavorite: boolean;
  annotations: Record<number, string>;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export type AnnotationTool = "none" | "draw" | "highlight" | "eraser";

export interface SearchResult {
  page: number;
  text: string;
}

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
  notes: Record<string, StickyNote>;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  page: number;
  x: number;
  y: number;
  color: string;
  text: string;
  createdAt: number;
}

export type AnnotationTool =
  | "none"
  | "draw"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "shape"
  | "eraser"
  | "textbox"
  | "stamp";

export type ShapeType = "line" | "rect" | "circle" | "arrow";
export type StampType = "approved" | "draft" | "confidential" | "reviewed" | "urgent";
export type ViewMode = "continuous" | "single";

export interface OutlineItem {
  title: string;
  page: number;
  depth: number;
}

export interface SearchResult {
  page: number;
  text: string;
}

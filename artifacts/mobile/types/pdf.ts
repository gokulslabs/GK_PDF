export interface PDFFile {
  id: string;
  name: string;
  uri: string;
  /** Content URI this copy was opened from, such as a Drive document. */
  sourceUri?: string;
  size: number;
  pageCount: number;
  lastOpened: number;
  lastPage: number;
  createdAt: number;
  folderId: string | null;
  isFavorite: boolean;
  /** Legacy full-page PNG data URLs from older builds. */
  annotations: Record<number, string>;
  /** Vector marks in PDF user space, keyed by 1-based page number. */
  markup: Record<number, MarkupOp[]>;
  /** AcroForm values keyed by field name. */
  formValues: Record<string, string>;
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
  /** Visual fraction of the page, top-left origin. Kept for older notes. */
  x: number;
  y: number;
  /** PDF user-space position. Present for notes created by the vector engine. */
  pdfX?: number;
  pdfY?: number;
  color: string;
  text: string;
  createdAt: number;
}

export interface PdfPoint {
  x: number;
  y: number;
}

/** Axis-aligned rectangle in PDF user space (y increases upward). */
export interface PdfRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type MarkupOp =
  | { type: "stroke"; color: string; width: number; points: PdfPoint[] }
  | { type: "highlight" | "underline" | "strike"; color: string; rects: PdfRect[] }
  | {
      type: "shape";
      shape: ShapeType;
      color: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { type: "stamp"; stamp: StampType; x: number; y: number; w: number; h: number }
  | { type: "text"; color: string; x: number; y: number; size: number; text: string };

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

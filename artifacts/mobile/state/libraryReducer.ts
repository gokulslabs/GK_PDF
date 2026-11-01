import { Folder, MarkupOp, PDFFile, StickyNote } from "@/types/pdf";

export interface LibraryData {
  files: PDFFile[];
  folders: Folder[];
  /** Once true, an empty library is not refilled with the sample PDF. */
  seeded: boolean;
}

export type LibraryAction =
  | { type: "hydrate"; data: LibraryData }
  | { type: "add"; file: PDFFile }
  | { type: "remove"; id: string }
  | { type: "toggleFavorite"; id: string }
  | { type: "progress"; id: string; page: number; pageCount?: number }
  | { type: "markup"; id: string; page: number; ops: MarkupOp[] }
  | { type: "form"; id: string; name: string; value: string }
  | { type: "addNote"; id: string; note: StickyNote }
  | { type: "updateNote"; id: string; noteId: string; text: string; color: string }
  | { type: "deleteNote"; id: string; noteId: string }
  | { type: "clear" }
  | { type: "markSeeded" };

export function emptyLibrary(): LibraryData {
  return { files: [], folders: [], seeded: false };
}

export function normalizeFile(raw: Partial<PDFFile> & Pick<PDFFile, "id" | "name" | "uri">): PDFFile {
  const annotations: Record<number, string> = {};
  for (const [page, data] of Object.entries(raw.annotations ?? {})) {
    if (typeof data === "string" && data.length > 0) annotations[Number(page)] = data;
  }
  const markup: Record<number, MarkupOp[]> = {};
  for (const [page, ops] of Object.entries(raw.markup ?? {})) {
    if (Array.isArray(ops)) markup[Number(page)] = ops as MarkupOp[];
  }
  return {
    id: raw.id,
    name: raw.name,
    uri: raw.uri,
    size: raw.size ?? 0,
    pageCount: raw.pageCount ?? 0,
    lastOpened: raw.lastOpened ?? raw.createdAt ?? Date.now(),
    lastPage: raw.lastPage ?? 1,
    createdAt: raw.createdAt ?? Date.now(),
    folderId: raw.folderId ?? null,
    isFavorite: raw.isFavorite ?? false,
    annotations,
    markup,
    formValues: { ...(raw.formValues ?? {}) },
    notes: raw.notes ?? {},
  };
}

export function normalizeLibrary(raw: Partial<LibraryData> | null | undefined): LibraryData {
  const files = (raw?.files ?? []).map((file) =>
    normalizeFile(file as PDFFile)
  );
  const seeded = raw?.seeded === true || files.length > 0;
  return {
    files,
    folders: raw?.folders ?? [],
    seeded,
  };
}

function mapFile(files: PDFFile[], id: string, update: (file: PDFFile) => PDFFile): PDFFile[] {
  return files.map((file) => (file.id === id ? update(file) : file));
}

export function libraryReducer(state: LibraryData, action: LibraryAction): LibraryData {
  switch (action.type) {
    case "hydrate":
      return normalizeLibrary(action.data);
    case "add":
      return { ...state, files: [normalizeFile(action.file), ...state.files] };
    case "remove":
      return { ...state, files: state.files.filter((file) => file.id !== action.id) };
    case "toggleFavorite":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => ({
          ...file,
          isFavorite: !file.isFavorite,
        })),
      };
    case "progress":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => ({
          ...file,
          lastPage: action.page,
          lastOpened: Date.now(),
          ...(action.pageCount != null ? { pageCount: action.pageCount } : {}),
        })),
      };
    case "markup":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => ({
          ...file,
          markup: { ...file.markup, [action.page]: action.ops },
        })),
      };
    case "form":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => ({
          ...file,
          formValues: { ...file.formValues, [action.name]: action.value },
        })),
      };
    case "addNote":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => ({
          ...file,
          notes: { ...file.notes, [action.note.id]: action.note },
        })),
      };
    case "updateNote":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => {
          const note = file.notes[action.noteId];
          if (!note) return file;
          return {
            ...file,
            notes: {
              ...file.notes,
              [action.noteId]: { ...note, text: action.text, color: action.color },
            },
          };
        }),
      };
    case "deleteNote":
      return {
        ...state,
        files: mapFile(state.files, action.id, (file) => {
          const notes = { ...file.notes };
          delete notes[action.noteId];
          return { ...file, notes };
        }),
      };
    case "clear":
      return { files: [], folders: [], seeded: true };
    case "markSeeded":
      return { ...state, seeded: true };
    default:
      return state;
  }
}

/**
 * Runs updates one at a time. Each callback sees the state committed by the
 * previous update, including updates that were already queued.
 */
export function createSerialQueue<T>(initial: T) {
  let state = initial;
  let chain: Promise<unknown> = Promise.resolve();
  return {
    get(): T {
      return state;
    },
    set(next: T) {
      state = next;
    },
    run<R>(fn: (current: T) => Promise<R> | R): Promise<R> {
      const run = chain.then(() => fn(state)) as Promise<R>;
      chain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

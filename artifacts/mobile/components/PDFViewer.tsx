import * as FileSystem from "expo-file-system";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { getPdfViewerHtml } from "@/constants/pdfHtml";
import { useColors } from "@/hooks/useColors";
import {
  AnnotationTool,
  MarkupOp,
  OutlineItem,
  ShapeType,
  StampType,
  StickyNote,
  ViewMode,
} from "@/types/pdf";

interface SearchResult {
  page: number;
  count: number;
}

export interface PDFViewerRef {
  setTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  goToPage: (page: number) => void;
  setDarkMode: (dark: boolean) => void;
  search: (query: string) => void;
  clearSearch: () => void;
  gotoSearchResult: (index: number) => void;
  setShapeType: (type: ShapeType) => void;
  setStampType: (type: StampType) => void;
  loadNotes: (notes: StickyNote[]) => void;
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, color: string, text: string) => void;
  deleteNote: (id: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFitWidth: () => void;
  zoomFitPage: () => void;
  zoomActual: () => void;
  rotatePage: (delta?: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setPassword: (password: string) => void;
  cancelPassword: () => void;
  undo: () => void;
  renderThumbnails: () => void;
}

interface Props {
  fileUri: string;
  darkMode: boolean;
  annotations: Record<number, string>;
  markup: Record<number, MarkupOp[]>;
  formValues: Record<string, string>;
  onPageChange?: (page: number) => void;
  onLoaded?: (totalPages: number) => void;
  onSlotsReady?: () => void;
  onError?: (msg: string) => void;
  onMarkupChange?: (page: number, ops: MarkupOp[]) => void;
  onFormChange?: (name: string, value: string) => void;
  onSearchDone?: (results: SearchResult[]) => void;
  onThumbnailReady?: (page: number, dataUrl: string, w: number, h: number) => void;
  onLongPress?: (page: number, x: number, y: number, pdfX: number, pdfY: number) => void;
  onNoteTap?: (noteId: string) => void;
  onOutlineReady?: (items: OutlineItem[]) => void;
  onScaleChange?: (percent: number) => void;
  onPasswordRequired?: (retry: boolean) => void;
  onUndoAvailable?: (canUndo: boolean) => void;
  onTap?: () => void;
}

function WebIframePDFViewer({
  innerRef,
  html,
  onMsg,
}: {
  innerRef: React.RefObject<HTMLIFrameElement | null>;
  html: string;
  onMsg: (data: string) => void;
}) {
  const onMsgRef = useRef(onMsg);
  onMsgRef.current = onMsg;

  useEffect(() => {
    function handler(e: MessageEvent) {
      if (innerRef.current && e.source === innerRef.current.contentWindow) {
        if (typeof e.data === "string") onMsgRef.current(e.data);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [innerRef]);

  return (
    <div style={{ position: "relative", flex: 1, width: "100%", overflow: "hidden" }}>
      <iframe
        ref={innerRef as React.RefObject<HTMLIFrameElement>}
        srcDoc={html}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin"
        title="PDF Viewer"
      />
    </div>
  );
}

const PDFViewer = forwardRef<PDFViewerRef, Props>(
  (
    {
      fileUri,
      darkMode,
      annotations,
      markup,
      formValues,
      onPageChange,
      onLoaded,
      onSlotsReady,
      onError,
      onMarkupChange,
      onFormChange,
      onSearchDone,
      onThumbnailReady,
      onLongPress,
      onNoteTap,
      onOutlineReady,
      onScaleChange,
      onPasswordRequired,
      onUndoAvailable,
      onTap,
    },
    ref
  ) => {
    const colors = useColors();
    const webRef = useRef<WebView>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [html, setHtml] = useState<string | null>(null);
    const pendingB64 = useRef<string | null>(null);
    const readyRef = useRef(false);
    const htmlDarkRef = useRef(darkMode);
    const darkRef = useRef(darkMode);
    const annotationsRef = useRef(annotations);
    const markupRef = useRef(markup);
    const formsRef = useRef(formValues);
    const epoch = useRef(0);

    darkRef.current = darkMode;
    annotationsRef.current = annotations;
    markupRef.current = markup;
    formsRef.current = formValues;

    const onPageChangeRef = useRef(onPageChange);
    const onLoadedRef = useRef(onLoaded);
    const onSlotsReadyRef = useRef(onSlotsReady);
    const onErrorRef = useRef(onError);
    const onMarkupChangeRef = useRef(onMarkupChange);
    const onFormChangeRef = useRef(onFormChange);
    const onSearchDoneRef = useRef(onSearchDone);
    const onThumbnailReadyRef = useRef(onThumbnailReady);
    const onLongPressRef = useRef(onLongPress);
    const onNoteTapRef = useRef(onNoteTap);
    const onOutlineReadyRef = useRef(onOutlineReady);
    const onScaleChangeRef = useRef(onScaleChange);
    const onPasswordRequiredRef = useRef(onPasswordRequired);
    const onUndoAvailableRef = useRef(onUndoAvailable);
    const onTapRef = useRef(onTap);
    onPageChangeRef.current = onPageChange;
    onLoadedRef.current = onLoaded;
    onSlotsReadyRef.current = onSlotsReady;
    onErrorRef.current = onError;
    onMarkupChangeRef.current = onMarkupChange;
    onFormChangeRef.current = onFormChange;
    onSearchDoneRef.current = onSearchDone;
    onThumbnailReadyRef.current = onThumbnailReady;
    onLongPressRef.current = onLongPress;
    onNoteTapRef.current = onNoteTap;
    onOutlineReadyRef.current = onOutlineReady;
    onScaleChangeRef.current = onScaleChange;
    onPasswordRequiredRef.current = onPasswordRequired;
    onUndoAvailableRef.current = onUndoAvailable;
    onTapRef.current = onTap;

    useEffect(() => {
      void loadFile();
    }, [fileUri]);

    async function loadFile() {
      const myEpoch = ++epoch.current;
      try {
        readyRef.current = false;
        setLoading(true);
        setError(null);
        setHtml(null);
        let b64: string;
        if (Platform.OS === "web" || fileUri.startsWith("http") || fileUri.startsWith("/")) {
          const response = await fetch(fileUri);
          if (!response.ok) throw new Error("Could not open PDF (" + response.status + ")");
          const blob = await response.blob();
          b64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.includes(",") ? result.split(",")[1] : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          b64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        if (myEpoch !== epoch.current) return;
        pendingB64.current = b64;
        htmlDarkRef.current = darkRef.current;
        setHtml(getPdfViewerHtml(darkRef.current));
      } catch (e: unknown) {
        if (myEpoch !== epoch.current) return;
        const msg = e instanceof Error ? e.message : "Failed to read file";
        setError(msg);
        setLoading(false);
        onErrorRef.current?.(msg);
      }
    }

    function inject(msg: object) {
      const payload = JSON.stringify(msg);
      if (Platform.OS === "web") {
        iframeRef.current?.contentWindow?.postMessage(payload, "*");
      } else {
        const escaped = JSON.stringify(payload);
        webRef.current?.injectJavaScript(`recv(${escaped});true;`);
      }
    }

    useEffect(() => {
      if (!readyRef.current) return;
      inject({ type: "DARK", value: darkMode });
    }, [darkMode]);

    useImperativeHandle(ref, () => ({
      setTool: (tool) => inject({ type: "TOOL", value: tool }),
      setColor: (color) => inject({ type: "COLOR", value: color }),
      goToPage: (page) => inject({ type: "GOTO", page }),
      setDarkMode: (dark) => inject({ type: "DARK", value: dark }),
      search: (query) => inject({ type: "SEARCH", query }),
      clearSearch: () => inject({ type: "SEARCH_CLEAR" }),
      gotoSearchResult: (index) => inject({ type: "SEARCH_GOTO", index }),
      setShapeType: (value) => inject({ type: "SHAPE_TYPE", value }),
      setStampType: (value) => inject({ type: "STAMP_TYPE", value }),
      loadNotes: (notes) => inject({ type: "LOAD_NOTES", notes }),
      addNote: (note) => inject({ type: "ADD_NOTE", note }),
      updateNote: (id, c, t) => inject({ type: "UPDATE_NOTE", id, color: c, text: t }),
      deleteNote: (id) => inject({ type: "DELETE_NOTE", id }),
      zoomIn: () => inject({ type: "ZOOM_IN" }),
      zoomOut: () => inject({ type: "ZOOM_OUT" }),
      zoomFitWidth: () => inject({ type: "ZOOM_FIT_WIDTH" }),
      zoomFitPage: () => inject({ type: "ZOOM_FIT_PAGE" }),
      zoomActual: () => inject({ type: "ZOOM_ACTUAL" }),
      rotatePage: (delta = 90) => inject({ type: "ROTATE", delta }),
      setViewMode: (mode) => inject({ type: "VIEW_MODE", value: mode }),
      setPassword: (password) => inject({ type: "SET_PASSWORD", value: password }),
      cancelPassword: () => inject({ type: "CANCEL_PASSWORD" }),
      undo: () => inject({ type: "UNDO" }),
      renderThumbnails: () => inject({ type: "RENDER_THUMBS" }),
    }));

    function restoreDocument() {
      const marks = markupRef.current ?? {};
      Object.entries(marks).forEach(([page, ops]) => {
        inject({ type: "RESTORE_MARKUP", page: parseInt(page, 10), ops });
      });
      const legacy = annotationsRef.current ?? {};
      Object.entries(legacy).forEach(([page, data]) => {
        if (data) inject({ type: "RESTORE_LEGACY", page: parseInt(page, 10), data });
      });
      inject({ type: "LOAD_FORMS", values: formsRef.current ?? {} });
    }

    function handleMsg(data: string) {
      try {
        const msg = JSON.parse(data);
        switch (msg.type) {
          case "READY":
            readyRef.current = true;
            if (pendingB64.current) {
              inject({ type: "LOAD", data: pendingB64.current });
              pendingB64.current = null;
            }
            if (darkRef.current !== htmlDarkRef.current) {
              inject({ type: "DARK", value: darkRef.current });
            }
            break;
          case "SLOTS_READY":
            restoreDocument();
            onSlotsReadyRef.current?.();
            break;
          case "LOADED":
            setLoading(false);
            onLoadedRef.current?.(msg.pages);
            break;
          case "PAGE":
            onPageChangeRef.current?.(msg.page);
            break;
          case "MARKUP":
            onMarkupChangeRef.current?.(msg.page, msg.ops ?? []);
            break;
          case "FORM":
            onFormChangeRef.current?.(msg.name, msg.value ?? "");
            break;
          case "SEARCH_DONE":
            onSearchDoneRef.current?.(msg.results ?? []);
            break;
          case "THUMB":
            onThumbnailReadyRef.current?.(msg.page, msg.data, msg.w, msg.h);
            break;
          case "LONG_PRESS":
            onLongPressRef.current?.(msg.page, msg.x, msg.y, msg.pdfX, msg.pdfY);
            break;
          case "NOTE_TAP":
            onNoteTapRef.current?.(msg.id);
            break;
          case "OUTLINE":
            onOutlineReadyRef.current?.(msg.items ?? []);
            break;
          case "SCALE":
            onScaleChangeRef.current?.(msg.value);
            break;
          case "PASSWORD_REQUIRED":
            onPasswordRequiredRef.current?.(msg.retry ?? false);
            break;
          case "UNDO_AVAILABLE":
            onUndoAvailableRef.current?.(msg.canUndo ?? false);
            break;
          case "TAP":
            onTapRef.current?.();
            break;
          case "ERROR":
            setError(msg.message);
            setLoading(false);
            onErrorRef.current?.(msg.message);
            break;
          default:
            break;
        }
      } catch {
        // Ignore malformed bridge messages.
      }
    }

    if (error) {
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: "#EF4444", textAlign: "center", padding: 24, fontSize: 14 }}>
            {error}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {html ? (
          Platform.OS === "web" ? (
            <WebIframePDFViewer innerRef={iframeRef} html={html} onMsg={handleMsg} />
          ) : (
            <WebView
              ref={webRef}
              source={{ html, baseUrl: "https://localhost" }}
              style={styles.webview}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              onMessage={(e: WebViewMessageEvent) => handleMsg(e.nativeEvent.data)}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              setSupportMultipleWindows={false}
            />
          )
        ) : null}
        {loading && (
          <View style={[styles.loader, { backgroundColor: darkMode ? "#1C1C1E" : "#E8E8E8" }]} pointerEvents="none">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
      </View>
    );
  }
);

PDFViewer.displayName = "PDFViewer";

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default PDFViewer;

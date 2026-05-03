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
import { AnnotationTool, ShapeType, StickyNote } from "@/types/pdf";

interface SearchResult {
  page: number;
  count: number;
}

export interface PDFViewerRef {
  setTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  goToPage: (page: number) => void;
  setDarkMode: (dark: boolean) => void;
  clearPage: (page: number) => void;
  restoreAnnotation: (page: number, data: string) => void;
  search: (query: string) => void;
  clearSearch: () => void;
  gotoSearchResult: (index: number) => void;
  setShapeType: (type: ShapeType) => void;
  loadNotes: (notes: StickyNote[]) => void;
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, color: string, text: string) => void;
  deleteNote: (id: string) => void;
}

interface Props {
  fileUri: string;
  darkMode: boolean;
  annotations: Record<number, string>;
  onPageChange?: (page: number) => void;
  onLoaded?: (totalPages: number) => void;
  onError?: (msg: string) => void;
  onAnnotationSaved?: (page: number, data: string) => void;
  onSearchDone?: (results: SearchResult[]) => void;
  onThumbnailReady?: (page: number, dataUrl: string, w: number, h: number) => void;
  onLongPress?: (page: number, x: number, y: number) => void;
  onNoteTap?: (noteId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Web-specific iframe renderer
// Uses a plain <iframe> so we can use contentWindow.postMessage directly,
// bypassing react-native-webview's unreliable web message bridge.
// ─────────────────────────────────────────────────────────────────────────────
function WebIframePDFViewer({
  innerRef,
  html,
  onMsg,
}: {
  innerRef: React.RefObject<HTMLIFrameElement | null>;
  html: string;
  onMsg: (data: string) => void;
}) {
  useEffect(() => {
    function handler(e: MessageEvent) {
      // Only accept messages from our own iframe
      if (innerRef.current && e.source === innerRef.current.contentWindow) {
        if (typeof e.data === "string") onMsg(e.data);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <iframe
      ref={innerRef as React.RefObject<HTMLIFrameElement>}
      srcDoc={html}
      style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
      sandbox="allow-scripts allow-same-origin"
      title="PDF Viewer"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const PDFViewer = forwardRef<PDFViewerRef, Props>(
  (
    {
      fileUri,
      darkMode,
      annotations,
      onPageChange,
      onLoaded,
      onError,
      onAnnotationSaved,
      onSearchDone,
      onThumbnailReady,
      onLongPress,
      onNoteTap,
    },
    ref
  ) => {
    const colors = useColors();

    // Native WebView ref
    const webRef = useRef<WebView>(null);
    // Web iframe ref
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [html, setHtml] = useState<string | null>(null);
    const pendingB64 = useRef<string | null>(null);
    const pendingAnnotations = useRef<Record<number, string>>(annotations);

    useEffect(() => {
      pendingAnnotations.current = annotations;
    }, [annotations]);

    useEffect(() => {
      loadFile();
    }, [fileUri, darkMode]);

    async function loadFile() {
      try {
        setLoading(true);
        setError(null);
        let b64: string;

        if (Platform.OS === "web" || fileUri.startsWith("http")) {
          const response = await fetch(fileUri);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

        pendingB64.current = b64;
        setHtml(getPdfViewerHtml(darkMode));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to read file";
        setError(msg);
        setLoading(false);
        onError?.(msg);
      }
    }

    // ── Bridge: send message to the viewer ──────────────────────────────────
    function inject(msg: object) {
      const payload = JSON.stringify(msg);
      if (Platform.OS === "web") {
        // Web: directly post to iframe contentWindow
        const win = iframeRef.current?.contentWindow;
        if (win) win.postMessage(payload, "*");
      } else {
        // Native: eval code in WebView
        const escaped = JSON.stringify(payload);
        webRef.current?.injectJavaScript(`recv(${escaped});true;`);
      }
    }

    useImperativeHandle(ref, () => ({
      setTool: (tool) => inject({ type: "TOOL", value: tool }),
      setColor: (color) => inject({ type: "COLOR", value: color }),
      goToPage: (page) => inject({ type: "GOTO", page }),
      setDarkMode: (dark) => inject({ type: "DARK", value: dark }),
      clearPage: (page) => inject({ type: "CLEAR", page }),
      restoreAnnotation: (page, data) => inject({ type: "RESTORE", page, data }),
      search: (query) => inject({ type: "SEARCH", query }),
      clearSearch: () => inject({ type: "SEARCH_CLEAR" }),
      gotoSearchResult: (index) => inject({ type: "SEARCH_GOTO", index }),
      setShapeType: (value) => inject({ type: "SHAPE_TYPE", value }),
      loadNotes: (notes) => inject({ type: "LOAD_NOTES", notes }),
      addNote: (note) => inject({ type: "ADD_NOTE", note }),
      updateNote: (id, color, text) => inject({ type: "UPDATE_NOTE", id, color, text }),
      deleteNote: (id) => inject({ type: "DELETE_NOTE", id }),
    }));

    // ── Bridge: receive message from the viewer ─────────────────────────────
    function handleMsg(data: string) {
      try {
        const msg = JSON.parse(data);
        switch (msg.type) {
          case "READY":
            if (pendingB64.current) {
              inject({ type: "LOAD", data: pendingB64.current });
              pendingB64.current = null;
            }
            break;
          case "LOADED":
            setLoading(false);
            onLoaded?.(msg.pages);
            Object.entries(pendingAnnotations.current).forEach(([page, d]) => {
              inject({ type: "RESTORE", page: parseInt(page), data: d });
            });
            break;
          case "PAGE":
            onPageChange?.(msg.page);
            break;
          case "ANNOT":
            onAnnotationSaved?.(msg.page, msg.data);
            break;
          case "SEARCH_DONE":
            onSearchDone?.(msg.results ?? []);
            break;
          case "THUMB":
            onThumbnailReady?.(msg.page, msg.data, msg.w, msg.h);
            break;
          case "LONG_PRESS":
            onLongPress?.(msg.page, msg.x, msg.y);
            break;
          case "NOTE_TAP":
            onNoteTap?.(msg.id);
            break;
          case "ERROR":
            setError(msg.message);
            setLoading(false);
            onError?.(msg.message);
            break;
        }
      } catch (_) {}
    }

    // Adapter for native WebView's onMessage event shape
    function handleWebViewMessage(e: WebViewMessageEvent) {
      handleMsg(e.nativeEvent.data);
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
            <WebIframePDFViewer
              innerRef={iframeRef}
              html={html}
              onMsg={handleMsg}
            />
          ) : (
            <WebView
              ref={webRef}
              source={{ html, baseUrl: "https://localhost" }}
              style={styles.webview}
              originWhitelist={["*"]}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleWebViewMessage}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
            />
          )
        ) : null}
        {loading && (
          <View style={[styles.loader, { backgroundColor: darkMode ? "#1C1C1E" : "#E8E8E8" }]}>
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

import * as FileSystem from "expo-file-system";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { getPdfViewerHtml } from "@/constants/pdfHtml";
import { useColors } from "@/hooks/useColors";
import { AnnotationTool } from "@/types/pdf";

export interface PDFViewerRef {
  setTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  goToPage: (page: number) => void;
  setDarkMode: (dark: boolean) => void;
  clearPage: (page: number) => void;
  restoreAnnotation: (page: number, data: string) => void;
}

interface Props {
  fileUri: string;
  darkMode: boolean;
  annotations: Record<number, string>;
  onPageChange?: (page: number) => void;
  onLoaded?: (totalPages: number) => void;
  onError?: (msg: string) => void;
  onAnnotationSaved?: (page: number, data: string) => void;
}

const PDFViewer = forwardRef<PDFViewerRef, Props>(
  ({ fileUri, darkMode, annotations, onPageChange, onLoaded, onError, onAnnotationSaved }, ref) => {
    const colors = useColors();
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [html, setHtml] = useState<string | null>(null);
    const pendingB64 = useRef<string | null>(null);
    const pendingAnnotations = useRef<Record<number, string>>(annotations);
    const isReady = useRef(false);

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
        isReady.current = false;
        const b64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        pendingB64.current = b64;
        setHtml(getPdfViewerHtml(darkMode));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to read file";
        setError(msg);
        setLoading(false);
        onError?.(msg);
      }
    }

    function inject(msg: object) {
      if (webRef.current) {
        const escaped = JSON.stringify(JSON.stringify(msg));
        webRef.current.injectJavaScript(`recv(${escaped});true;`);
      }
    }

    useImperativeHandle(ref, () => ({
      setTool: (tool) => inject({ type: "TOOL", value: tool }),
      setColor: (color) => inject({ type: "COLOR", value: color }),
      goToPage: (page) => inject({ type: "GOTO", page }),
      setDarkMode: (dark) => inject({ type: "DARK", value: dark }),
      clearPage: (page) => inject({ type: "CLEAR", page }),
      restoreAnnotation: (page, data) => inject({ type: "RESTORE", page, data }),
    }));

    function handleMessage(e: WebViewMessageEvent) {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        switch (msg.type) {
          case "READY":
            isReady.current = true;
            if (pendingB64.current) {
              inject({ type: "LOAD", data: pendingB64.current });
              pendingB64.current = null;
            }
            break;
          case "LOADED":
            setLoading(false);
            onLoaded?.(msg.pages);
            Object.entries(pendingAnnotations.current).forEach(([page, data]) => {
              inject({ type: "RESTORE", page: parseInt(page), data });
            });
            break;
          case "PAGE":
            onPageChange?.(msg.page);
            break;
          case "ANNOT":
            onAnnotationSaved?.(msg.page, msg.data);
            break;
          case "ERROR":
            setError(msg.message);
            setLoading(false);
            onError?.(msg.message);
            break;
        }
      } catch (_) {}
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
            onMessage={handleMessage}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          />
        ) : null}
        {loading && (
          <View
            style={[
              styles.loader,
              { backgroundColor: darkMode ? "#1C1C1E" : "#E8E8E8" },
            ]}
          >
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
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default PDFViewer;

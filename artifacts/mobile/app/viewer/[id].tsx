import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnnotationToolbar from "@/components/AnnotationToolbar";
import PDFViewer, { PDFViewerRef } from "@/components/PDFViewer";
import PageIndicator from "@/components/PageIndicator";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import { AnnotationTool } from "@/types/pdf";

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { getFileById, toggleFavorite, updateProgress, saveAnnotation } =
    useLibrary();
  const file = getFileById(id ?? "");

  const pdfRef = useRef<PDFViewerRef>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [activeColor, setActiveColor] = useState("#FFEB3B");
  const [chromVisible, setChromVisible] = useState(true);

  const chromAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (file?.lastPage && file.lastPage > 1) {
      const t = setTimeout(() => {
        pdfRef.current?.goToPage(file.lastPage);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, []);

  const toggleChrom = useCallback(() => {
    const toValue = chromVisible ? 0 : 1;
    Animated.timing(chromAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setChromVisible(!chromVisible);
  }, [chromVisible]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    if (file) updateProgress(file.id, page);
  }

  function handleLoaded(pages: number) {
    setTotalPages(pages);
    if (file) updateProgress(file.id, file.lastPage || 1, pages);
  }

  function handleTool(tool: AnnotationTool) {
    setActiveTool(tool);
    pdfRef.current?.setTool(tool);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleColor(color: string) {
    setActiveColor(color);
    pdfRef.current?.setColor(color);
  }

  function handleFavorite() {
    if (!file) return;
    toggleFavorite(file.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleAnnotationSaved(page: number, data: string) {
    if (file) saveAnnotation(file.id, page, data);
  }

  if (!file) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, marginTop: 12, fontSize: 16 }}>
          File not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1C1C1E" : "#E8E8E8" },
      ]}
    >
      {Platform.OS !== "web" && (
        <StatusBar barStyle="light-content" hidden={!chromVisible} />
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={toggleChrom}
        style={styles.pdfArea}
      >
        <PDFViewer
          ref={pdfRef}
          fileUri={file.uri}
          darkMode={isDark}
          annotations={file.annotations}
          onPageChange={handlePageChange}
          onLoaded={handleLoaded}
          onAnnotationSaved={handleAnnotationSaved}
        />
      </TouchableOpacity>

      {/* Top header */}
      <Animated.View
        style={[
          styles.header,
          {
            top: topInset,
            opacity: chromAnim,
            transform: [
              {
                translateY: chromAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-64, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={chromVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={28} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {file.name.replace(/\.pdf$/i, "")}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
            <Feather
              name="bookmark"
              size={21}
              color={file.isFavorite ? "#FBBF24" : "white"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowToolbar((s) => !s)}
            style={styles.headerBtn}
          >
            <Feather
              name="edit-2"
              size={19}
              color={showToolbar ? "#60A5FA" : "white"}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Page indicator */}
      {totalPages > 0 && chromVisible && (
        <Animated.View
          style={[
            styles.pageIndicator,
            {
              bottom: bottomInset + (showToolbar ? 68 : 16),
              opacity: chromAnim,
            },
          ]}
        >
          <PageIndicator current={currentPage} total={totalPages} />
        </Animated.View>
      )}

      {/* Annotation toolbar */}
      {showToolbar && (
        <View style={[styles.toolbar, { bottom: bottomInset }]}>
          <AnnotationToolbar
            activeTool={activeTool}
            activeColor={activeColor}
            onToolChange={handleTool}
            onColorChange={handleColor}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdfArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backLink: { marginTop: 12, padding: 8 },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  headerBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  headerActions: { flexDirection: "row" },
  pageIndicator: {
    position: "absolute",
    right: 16,
  },
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});

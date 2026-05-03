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
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnnotationToolbar from "@/components/AnnotationToolbar";
import PDFViewer, { PDFViewerRef } from "@/components/PDFViewer";
import PageIndicator from "@/components/PageIndicator";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import { AnnotationTool } from "@/types/pdf";

interface SearchResult {
  page: number;
  count: number;
}

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
  const searchInputRef = useRef<TextInput>(null);

  // Reader state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [activeColor, setActiveColor] = useState("#FFEB3B");
  const [chromVisible, setChromVisible] = useState(true);
  const chromAnim = useRef(new Animated.Value(1)).current;

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchResultIdx, setSearchResultIdx] = useState(0);
  const [searchPending, setSearchPending] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (file?.lastPage && file.lastPage > 1) {
      const t = setTimeout(() => pdfRef.current?.goToPage(file.lastPage), 2200);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Chrome toggle ──────────────────────────────────────────────────────
  const toggleChrom = useCallback(() => {
    const toValue = chromVisible ? 0 : 1;
    Animated.timing(chromAnim, { toValue, duration: 200, useNativeDriver: true }).start();
    setChromVisible((v) => !v);
  }, [chromVisible]);

  // ── Page change / loaded ───────────────────────────────────────────────
  function handlePageChange(page: number) {
    setCurrentPage(page);
    if (file) updateProgress(file.id, page);
  }

  function handleLoaded(pages: number) {
    setTotalPages(pages);
    if (file) updateProgress(file.id, file.lastPage || 1, pages);
  }

  // ── Annotation ─────────────────────────────────────────────────────────
  function handleTool(t: AnnotationTool) {
    setActiveTool(t);
    pdfRef.current?.setTool(t);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handleColor(c: string) {
    setActiveColor(c);
    pdfRef.current?.setColor(c);
  }
  function handleAnnotationSaved(page: number, data: string) {
    if (file) saveAnnotation(file.id, page, data);
  }

  // ── Favorite ───────────────────────────────────────────────────────────
  function handleFavorite() {
    if (!file) return;
    toggleFavorite(file.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // ── Search ─────────────────────────────────────────────────────────────
  function openSearch() {
    setIsSearching(true);
    setSearchQuery("");
    setSearchResults([]);
    setSearchResultIdx(0);
    setShowToolbar(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  function closeSearch() {
    setIsSearching(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchResultIdx(0);
    setSearchPending(false);
    pdfRef.current?.clearSearch?.();
    Keyboard.dismiss();
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    setSearchPending(true);
    setSearchResults([]);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!text.trim()) {
      setSearchPending(false);
      pdfRef.current?.clearSearch?.();
      return;
    }
    searchDebounce.current = setTimeout(() => {
      pdfRef.current?.search?.(text.trim());
    }, 500);
  }

  function handleSearchDone(results: SearchResult[]) {
    setSearchResults(results);
    setSearchResultIdx(0);
    setSearchPending(false);
  }

  function goToPrevResult() {
    if (searchResults.length === 0) return;
    const idx = searchResultIdx === 0 ? searchResults.length - 1 : searchResultIdx - 1;
    setSearchResultIdx(idx);
    pdfRef.current?.gotoSearchResult?.(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function goToNextResult() {
    if (searchResults.length === 0) return;
    const idx = (searchResultIdx + 1) % searchResults.length;
    setSearchResultIdx(idx);
    pdfRef.current?.gotoSearchResult?.(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Render guard ───────────────────────────────────────────────────────
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
  const hasResults = searchResults.length > 0;
  const noResults = isSearching && !searchPending && searchQuery.length > 0 && searchResults.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#1C1C1E" : "#E8E8E8" }]}>
      {Platform.OS !== "web" && (
        <StatusBar barStyle="light-content" hidden={!chromVisible} />
      )}

      {/* PDF area — tap to toggle chrome */}
      <TouchableOpacity activeOpacity={1} onPress={toggleChrom} style={styles.pdfArea}>
        <PDFViewer
          ref={pdfRef}
          fileUri={file.uri}
          darkMode={isDark}
          annotations={file.annotations}
          onPageChange={handlePageChange}
          onLoaded={handleLoaded}
          onAnnotationSaved={handleAnnotationSaved}
          onSearchDone={handleSearchDone}
        />
      </TouchableOpacity>

      {/* ── Top header ── */}
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
        {/* Back button */}
        <TouchableOpacity
          onPress={isSearching ? closeSearch : () => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={isSearching ? "x" : "chevron-left"} size={26} color="white" />
        </TouchableOpacity>

        {/* Title or Search input */}
        {isSearching ? (
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={14} color="rgba(255,255,255,0.6)" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search in PDF…"
              placeholderTextColor="rgba(255,255,255,0.45)"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={() => {
                if (searchQuery.trim()) pdfRef.current?.search?.(searchQuery.trim());
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange("")}>
                <Feather name="x-circle" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {file.name.replace(/\.pdf$/i, "")}
          </Text>
        )}

        {/* Right actions */}
        <View style={styles.headerActions}>
          {!isSearching && (
            <>
              <TouchableOpacity onPress={openSearch} style={styles.headerBtn}>
                <Feather name="search" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
                <Feather
                  name="bookmark"
                  size={20}
                  color={file.isFavorite ? "#FBBF24" : "white"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowToolbar((s) => !s)}
                style={styles.headerBtn}
              >
                <Feather
                  name="edit-2"
                  size={18}
                  color={showToolbar ? "#60A5FA" : "white"}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* ── Search result bar (below header) ── */}
      {isSearching && chromVisible && (
        <Animated.View
          style={[
            styles.searchBar,
            {
              top: topInset + 56,
              opacity: chromAnim,
              backgroundColor: "rgba(0,0,0,0.75)",
            },
          ]}
          pointerEvents="auto"
        >
          {searchPending ? (
            <Text style={styles.searchStatus}>Searching…</Text>
          ) : noResults ? (
            <Text style={[styles.searchStatus, { color: "#EF4444" }]}>
              No results found
            </Text>
          ) : hasResults ? (
            <>
              <TouchableOpacity onPress={goToPrevResult} style={styles.resultNavBtn}>
                <Feather name="chevron-up" size={18} color="white" />
              </TouchableOpacity>
              <Text style={styles.searchResultCount}>
                {searchResultIdx + 1} of {searchResults.length}{" "}
                {searchResults.length === 1 ? "page" : "pages"}
                {" · "}
                <Text style={{ color: "#FCD34D" }}>
                  {searchResults[searchResultIdx]?.count ?? 0} match
                  {(searchResults[searchResultIdx]?.count ?? 0) !== 1 ? "es" : ""}
                </Text>
              </Text>
              <TouchableOpacity onPress={goToNextResult} style={styles.resultNavBtn}>
                <Feather name="chevron-down" size={18} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.searchStatus}>
              Type to search within this PDF
            </Text>
          )}
        </Animated.View>
      )}

      {/* ── Page indicator ── */}
      {totalPages > 0 && chromVisible && !isSearching && (
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

      {/* ── Annotation toolbar ── */}
      {showToolbar && !isSearching && (
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  backLink: { marginTop: 12, padding: 8 },

  // Header
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
    width: 44,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  headerActions: { flexDirection: "row", alignItems: "center" },

  // Search input in header
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 4,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },

  // Search results bar below header
  searchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  searchStatus: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  searchResultCount: {
    flex: 1,
    color: "white",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  resultNavBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
  },

  // Page indicator
  pageIndicator: {
    position: "absolute",
    right: 16,
  },

  // Annotation toolbar
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});

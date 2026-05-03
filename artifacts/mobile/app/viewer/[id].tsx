import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnnotationToolbar from "@/components/AnnotationToolbar";
import NoteModal from "@/components/NoteModal";
import PDFViewer, { PDFViewerRef } from "@/components/PDFViewer";
import PageIndicator from "@/components/PageIndicator";
import ShareSheet from "@/components/ShareSheet";
import ThumbnailStrip from "@/components/ThumbnailStrip";
import { useLibrary } from "@/context/LibraryContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { AnnotationTool, ShapeType, StickyNote } from "@/types/pdf";

interface SearchResult { page: number; count: number; }

const STRIP_H = 108;

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isDark } = useTheme();

  const { getFileById, toggleFavorite, updateProgress, saveAnnotation, addNote, updateNote, deleteNote } =
    useLibrary();
  const file = getFileById(id ?? "");

  const pdfRef = useRef<PDFViewerRef>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Reader
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [activeColor, setActiveColor] = useState("#FFEB3B");
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [chromVisible, setChromVisible] = useState(true);
  const chromAnim = useRef(new Animated.Value(1)).current;

  // Thumbnails
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  // Search
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchResultIdx, setSearchResultIdx] = useState(0);
  const [searchPending, setSearchPending] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Share
  const [showShare, setShowShare] = useState(false);

  // Notes
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteModalEditing, setNoteModalEditing] = useState(false);
  const pendingNotePos = useRef<{ page: number; x: number; y: number } | null>(null);
  const activeNoteId = useRef<string | null>(null);
  const [noteInitialText, setNoteInitialText] = useState("");
  const [noteInitialColor, setNoteInitialColor] = useState("#FFEB3B");

  useEffect(() => {
    if (file?.lastPage && file.lastPage > 1) {
      const t = setTimeout(() => pdfRef.current?.goToPage(file.lastPage), 2200);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Chrome ─────────────────────────────────────────────────────────────
  const toggleChrom = useCallback(() => {
    const toValue = chromVisible ? 0 : 1;
    Animated.timing(chromAnim, { toValue, duration: 200, useNativeDriver: true }).start();
    setChromVisible((v) => !v);
  }, [chromVisible]);

  // ── Page ───────────────────────────────────────────────────────────────
  function handlePageChange(page: number) {
    setCurrentPage(page);
    if (file) updateProgress(file.id, page);
  }

  function handleLoaded(pages: number) {
    setTotalPages(pages);
    if (file) {
      updateProgress(file.id, file.lastPage || 1, pages);
      // Load saved notes into WebView
      const notesList = Object.values(file.notes);
      if (notesList.length > 0) {
        setTimeout(() => pdfRef.current?.loadNotes(notesList), 300);
      }
    }
  }

  // ── Annotations ────────────────────────────────────────────────────────
  function handleTool(t: AnnotationTool) {
    setActiveTool(t);
    pdfRef.current?.setTool(t);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handleColor(c: string) {
    setActiveColor(c);
    pdfRef.current?.setColor(c);
  }
  function handleShapeType(t: ShapeType) {
    setShapeType(t);
    pdfRef.current?.setShapeType?.(t);
  }
  function handleAnnotationSaved(page: number, data: string) {
    if (file) saveAnnotation(file.id, page, data);
  }

  // ── Thumbnails ─────────────────────────────────────────────────────────
  function handleThumbnailReady(page: number, dataUrl: string) {
    setThumbnails((prev) => ({ ...prev, [page]: dataUrl }));
  }
  function handleThumbPageSelect(page: number) {
    pdfRef.current?.goToPage(page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function toggleThumbs() {
    setShowThumbs((v) => !v);
    if (showToolbar) setShowToolbar(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Favorite ───────────────────────────────────────────────────────────
  function handleFavorite() {
    if (!file) return;
    toggleFavorite(file.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // ── Search ─────────────────────────────────────────────────────────────
  function openSearch() {
    setIsSearching(true); setSearchQuery(""); setSearchResults([]); setSearchResultIdx(0);
    setShowToolbar(false); setShowThumbs(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }
  function closeSearch() {
    setIsSearching(false); setSearchQuery(""); setSearchResults([]); setSearchResultIdx(0);
    setSearchPending(false); pdfRef.current?.clearSearch?.(); Keyboard.dismiss();
  }
  function handleSearchChange(text: string) {
    setSearchQuery(text); setSearchPending(true); setSearchResults([]);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!text.trim()) { setSearchPending(false); pdfRef.current?.clearSearch?.(); return; }
    searchDebounce.current = setTimeout(() => pdfRef.current?.search?.(text.trim()), 500);
  }
  function handleSearchDone(results: SearchResult[]) {
    setSearchResults(results); setSearchResultIdx(0); setSearchPending(false);
  }
  function goToPrevResult() {
    if (!searchResults.length) return;
    const idx = searchResultIdx === 0 ? searchResults.length - 1 : searchResultIdx - 1;
    setSearchResultIdx(idx); pdfRef.current?.gotoSearchResult?.(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function goToNextResult() {
    if (!searchResults.length) return;
    const idx = (searchResultIdx + 1) % searchResults.length;
    setSearchResultIdx(idx); pdfRef.current?.gotoSearchResult?.(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  function handleLongPress(page: number, x: number, y: number) {
    if (!file) return;
    pendingNotePos.current = { page, x, y };
    activeNoteId.current = null;
    setNoteInitialText("");
    setNoteInitialColor("#FFEB3B");
    setNoteModalEditing(false);
    setNoteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleNoteTap(noteId: string) {
    if (!file) return;
    const note = file.notes[noteId];
    if (!note) return;
    activeNoteId.current = noteId;
    pendingNotePos.current = null;
    setNoteInitialText(note.text);
    setNoteInitialColor(note.color);
    setNoteModalEditing(true);
    setNoteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleNoteSave(text: string, color: string) {
    if (!file) return;
    setNoteModalVisible(false);

    if (noteModalEditing && activeNoteId.current) {
      // Update existing note
      const noteId = activeNoteId.current;
      await updateNote(file.id, noteId, text, color);
      pdfRef.current?.updateNote?.(noteId, color, text);
    } else if (pendingNotePos.current) {
      // Create new note
      const pos = pendingNotePos.current;
      const newNote: StickyNote = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        page: pos.page,
        x: pos.x,
        y: pos.y,
        color,
        text,
        createdAt: Date.now(),
      };
      await addNote(file.id, newNote);
      pdfRef.current?.addNote?.(newNote);
    }

    activeNoteId.current = null;
    pendingNotePos.current = null;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleNoteDelete() {
    if (!file || !activeNoteId.current) return;
    setNoteModalVisible(false);
    const noteId = activeNoteId.current;
    await deleteNote(file.id, noteId);
    pdfRef.current?.deleteNote?.(noteId);
    activeNoteId.current = null;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  function handleNoteCancel() {
    setNoteModalVisible(false);
    activeNoteId.current = null;
    pendingNotePos.current = null;
  }

  // ── Guard ──────────────────────────────────────────────────────────────
  if (!file) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, marginTop: 12, fontSize: 16 }}>File not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const hasResults = searchResults.length > 0;
  const noResults = isSearching && !searchPending && searchQuery.length > 0 && !hasResults;
  const bottomExtra = (showThumbs ? STRIP_H : 0) + (showToolbar ? 60 : 0) + bottomInset;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#1C1C1E" : "#E8E8E8" }]}>
      {Platform.OS !== "web" && <StatusBar barStyle="light-content" hidden={!chromVisible} />}

      {/* PDF area */}
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
          onThumbnailReady={handleThumbnailReady}
          onLongPress={handleLongPress}
          onNoteTap={handleNoteTap}
        />
      </TouchableOpacity>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.header, {
          top: topInset, opacity: chromAnim,
          transform: [{ translateY: chromAnim.interpolate({ inputRange: [0,1], outputRange: [-64,0] }) }],
        }]}
        pointerEvents={chromVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={isSearching ? closeSearch : () => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={isSearching ? "x" : "chevron-left"} size={26} color="white" />
        </TouchableOpacity>

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
              onSubmitEditing={() => { if (searchQuery.trim()) pdfRef.current?.search?.(searchQuery.trim()); }}
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

        {!isSearching && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openSearch} style={styles.headerBtn}>
              <Feather name="search" size={19} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleThumbs} style={styles.headerBtn}>
              <Feather name="grid" size={18} color={showThumbs ? "#60A5FA" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
              <Feather name="bookmark" size={19} color={file.isFavorite ? "#FBBF24" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowToolbar((s) => !s); if (showThumbs) setShowThumbs(false); }}
              style={styles.headerBtn}
            >
              <Feather name="edit-2" size={17} color={showToolbar ? "#60A5FA" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowShare(true)}
              style={styles.headerBtn}
            >
              <Feather name="share-2" size={17} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* ── Search results bar ──────────────────────────────────────────── */}
      {isSearching && chromVisible && (
        <Animated.View
          style={[styles.searchBar, { top: topInset + 56, opacity: chromAnim, backgroundColor: "rgba(0,0,0,0.75)" }]}
          pointerEvents="auto"
        >
          {searchPending ? (
            <Text style={styles.searchStatus}>Searching…</Text>
          ) : noResults ? (
            <Text style={[styles.searchStatus, { color: "#EF4444" }]}>No results found</Text>
          ) : hasResults ? (
            <>
              <TouchableOpacity onPress={goToPrevResult} style={styles.resultNavBtn}>
                <Feather name="chevron-up" size={18} color="white" />
              </TouchableOpacity>
              <Text style={styles.searchResultCount}>
                {searchResultIdx + 1} of {searchResults.length}{" "}
                {searchResults.length === 1 ? "page" : "pages"}
                {"  ·  "}
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
            <Text style={styles.searchStatus}>Type to search within this PDF</Text>
          )}
        </Animated.View>
      )}

      {/* ── Page indicator ──────────────────────────────────────────────── */}
      {totalPages > 0 && chromVisible && !isSearching && (
        <Animated.View style={[styles.pageIndicator, { bottom: bottomExtra + 14, opacity: chromAnim }]}>
          <PageIndicator current={currentPage} total={totalPages} />
        </Animated.View>
      )}

      {/* ── Annotation toolbar ───────────────────────────────────────────── */}
      {showToolbar && !isSearching && (
        <View style={[styles.toolbar, { bottom: (showThumbs ? STRIP_H : 0) + bottomInset }]}>
          <AnnotationToolbar
            activeTool={activeTool}
            activeColor={activeColor}
            shapeType={shapeType}
            onToolChange={handleTool}
            onColorChange={handleColor}
            onShapeTypeChange={handleShapeType}
          />
        </View>
      )}

      {/* ── Thumbnail strip ─────────────────────────────────────────────── */}
      {totalPages > 0 && (
        <View style={[styles.thumbsWrap, { bottom: bottomInset }]}>
          <ThumbnailStrip
            thumbnails={thumbnails}
            totalPages={totalPages}
            currentPage={currentPage}
            visible={showThumbs}
            onPageSelect={handleThumbPageSelect}
          />
        </View>
      )}

      {/* ── Share sheet ─────────────────────────────────────────────────── */}
      {showShare && (
        <ShareSheet
          visible={showShare}
          file={file}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ── Sticky note modal ────────────────────────────────────────────── */}
      <NoteModal
        visible={noteModalVisible}
        initialText={noteInitialText}
        initialColor={noteInitialColor}
        isEditing={noteModalEditing}
        onSave={handleNoteSave}
        onDelete={handleNoteDelete}
        onCancel={handleNoteCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdfArea: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  backLink: { marginTop: 12, padding: 8 },

  header: {
    position: "absolute", left: 0, right: 0, height: 56,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 2,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  headerBtn: { width: 42, height: 46, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1, color: "white", fontSize: 14, fontWeight: "600",
    fontFamily: "Inter_600SemiBold", textAlign: "center",
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 4, gap: 6,
  },
  searchInput: {
    flex: 1, color: "white", fontSize: 15,
    fontFamily: "Inter_400Regular", paddingVertical: 0,
  },

  searchBar: {
    position: "absolute", left: 0, right: 0, height: 44,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 16, gap: 8,
  },
  searchStatus: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular" },
  searchResultCount: { flex: 1, color: "white", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  resultNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18 },

  pageIndicator: { position: "absolute", right: 16 },
  toolbar: { position: "absolute", left: 0, right: 0 },
  thumbsWrap: { position: "absolute", left: 0, right: 0 },
});

import Feather from "react-native-vector-icons/Feather";
import * as Haptics from "@/utils/haptics";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
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
import ColorPickerModal from "@/components/ColorPickerModal";
import NoteModal from "@/components/NoteModal";
import OutlinePanel from "@/components/OutlinePanel";
import PDFViewer, { PDFViewerRef } from "@/components/PDFViewer";
import ShareSheet from "@/components/ShareSheet";
import ThumbnailStrip from "@/components/ThumbnailStrip";
import { useLibrary } from "@/context/LibraryContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import type { RootStackParamList } from "@/navigation/types";
import {
  AnnotationTool,
  MarkupOp,
  OutlineItem,
  ShapeType,
  StampType,
  StickyNote,
  ViewMode,
} from "@/types/pdf";

interface SearchResult { page: number; count: number; }

const STRIP_H = 108;

export default function ViewerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Viewer">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const id = route.params.id;
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const ink = isDark ? "#FFFFFF" : "#1A1A1A";
  const inkMuted = isDark ? "rgba(255,255,255,0.62)" : "rgba(26,26,26,0.55)";
  const barBg = isDark ? "rgba(26,10,10,0.94)" : "rgba(255,255,255,0.97)";
  const barLine = isDark ? "rgba(239,68,68,0.35)" : "rgba(220,38,38,0.18)";
  const chipBg = isDark ? "rgba(220,38,38,0.22)" : "rgba(220,38,38,0.08)";
  const chipLine = isDark ? "rgba(239,68,68,0.45)" : "rgba(220,38,38,0.28)";

  const {
    getFileById,
    toggleFavorite,
    updateProgress,
    saveMarkup,
    saveFormValue,
    addNote,
    updateNote,
    deleteNote,
  } = useLibrary();
  const file = getFileById(id ?? "");

  const pdfRef = useRef<PDFViewerRef>(null);
  const resumedRef = useRef(false);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileId = id ?? "";
  const searchInputRef = useRef<TextInput>(null);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reader state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("none");
  const [activeColor, setActiveColor] = useState("#FFEB3B");
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [stampType, setStampType] = useState<StampType>("approved");
  const [chromVisible, setChromVisible] = useState(true);
  const chromAnim = useRef(new Animated.Value(1)).current;

  // ── Outline ───────────────────────────────────────────────────────────
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const outlineAnim = useRef(new Animated.Value(-290)).current;

  // ── Zoom ──────────────────────────────────────────────────────────────
  const [zoomPct, setZoomPct] = useState(100);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>("continuous");

  // ── Undo / Color picker ───────────────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ── Go-to-page input ─────────────────────────────────────────────────
  const [showMenu, setShowMenu] = useState(false);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const pageInputRef = useRef<TextInput>(null);

  // ── Thumbnails ────────────────────────────────────────────────────────
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  // ── Search ────────────────────────────────────────────────────────────
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchResultIdx, setSearchResultIdx] = useState(0);
  const [searchPending, setSearchPending] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Share ─────────────────────────────────────────────────────────────
  const [showShare, setShowShare] = useState(false);

  // ── Notes ─────────────────────────────────────────────────────────────
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteModalEditing, setNoteModalEditing] = useState(false);
  const pendingNotePos = useRef<{ page: number; x: number; y: number; pdfX?: number; pdfY?: number } | null>(null);
  const activeNoteId = useRef<string | null>(null);
  const [noteInitialText, setNoteInitialText] = useState("");
  const [noteInitialColor, setNoteInitialColor] = useState("#FFEB3B");

  // ── Password ──────────────────────────────────────────────────────────
  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdRetry, setPwdRetry] = useState(false);
  const [pwdInput, setPwdInput] = useState("");

  useEffect(() => {
    resumedRef.current = false;
  }, [fileId]);

  // ── Chrome / auto-hide ────────────────────────────────────────────────
  const HIDE_DELAY = 4000;

  const hideChrom = useCallback(() => {
    Animated.timing(chromAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    setChromVisible(false);
  }, [chromAnim]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(hideChrom, HIDE_DELAY);
  }, [hideChrom]);

  const showChrom = useCallback(() => {
    if (!chromVisible) {
      Animated.timing(chromAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setChromVisible(true);
    }
    resetInactivityTimer();
  }, [chromVisible, chromAnim, resetInactivityTimer]);

  // Pause auto-hide while any UI panel is open; restart when all are closed
  useEffect(() => {
    const anyPanelOpen = showToolbar || isSearching || showThumbs || showOutline || showColorPicker || noteModalVisible || pwdVisible || showShare || showMenu;
    if (anyPanelOpen) {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    } else {
      resetInactivityTimer();
    }
  }, [showToolbar, isSearching, showThumbs, showOutline, showColorPicker, noteModalVisible, pwdVisible, showShare, showMenu]);

  // Start timer on mount
  useEffect(() => {
    resetInactivityTimer();
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current); };
  }, []);

  // ── Outline panel ────────────────────────────────────────────────────
  function openOutline() {
    setShowOutline(true);
    Animated.spring(outlineAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function closeOutline() {
    Animated.timing(outlineAnim, { toValue: -290, duration: 220, useNativeDriver: true }).start(() =>
      setShowOutline(false)
    );
  }
  function handleOutlineNavigate(page: number) {
    pdfRef.current?.goToPage(page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Zoom ─────────────────────────────────────────────────────────────
  function toggleZoom() {
    setShowZoomControls((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handleRotate() {
    pdfRef.current?.rotatePage(90);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  function handleViewMode() {
    const next: ViewMode = viewMode === "continuous" ? "single" : "continuous";
    setViewModeState(next);
    pdfRef.current?.setViewMode(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Go-to-page ────────────────────────────────────────────────────────
  function openPageInput() {
    setPageInputValue(String(currentPage));
    setShowPageInput(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      pageInputRef.current?.focus();
      const length = pageInputValue.length;
      pageInputRef.current?.setNativeProps?.({ selection: { start: 0, end: length } });
    }, 80);
  }
  function closePageInput() {
    setShowPageInput(false);
    setPageInputValue("");
    Keyboard.dismiss();
  }
  function submitPageInput() {
    const n = parseInt(pageInputValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      pdfRef.current?.goToPage(n);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    closePageInput();
  }

  // ── Page ──────────────────────────────────────────────────────────────
  function handlePageChange(page: number) {
    setCurrentPage(page);
    if (!fileId) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      void updateProgress(fileId, page);
    }, 400);
  }
  function handleLoaded(pages: number) {
    setTotalPages(pages);
    const current = getFileById(fileId);
    if (fileId && current && current.pageCount !== pages) {
      void updateProgress(fileId, current.lastPage || 1, pages);
    }
  }
  function handleSlotsReady() {
    const current = getFileById(fileId);
    if (!current || resumedRef.current) return;
    resumedRef.current = true;
    const notesList = Object.values(current.notes ?? {});
    if (notesList.length > 0) pdfRef.current?.loadNotes(notesList);
    if ((current.lastPage || 1) > 1) pdfRef.current?.goToPage(current.lastPage);
  }

  // ── Annotations ──────────────────────────────────────────────────────
  function handleTool(t: AnnotationTool) {
    setActiveTool(t);
    pdfRef.current?.setTool(t);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handleColor(c: string) {
    setActiveColor(c);
    pdfRef.current?.setColor(c);
  }
  function handleUndo() {
    pdfRef.current?.undo();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handleShapeType(t: ShapeType) {
    setShapeType(t);
    pdfRef.current?.setShapeType?.(t);
  }
  function handleStampType(t: StampType) {
    setStampType(t);
    pdfRef.current?.setStampType?.(t);
  }
  function handleMarkupChange(page: number, ops: MarkupOp[]) {
    if (fileId) void saveMarkup(fileId, page, ops);
  }
  function handleFormChange(name: string, value: string) {
    if (fileId && name) void saveFormValue(fileId, name, value);
  }

  // ── Thumbnails ────────────────────────────────────────────────────────
  function handleThumbnailReady(page: number, dataUrl: string) {
    setThumbnails((prev) => ({ ...prev, [page]: dataUrl }));
  }
  function handleThumbPageSelect(page: number) {
    pdfRef.current?.goToPage(page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function toggleThumbs() {
    setShowThumbs((v) => {
      const next = !v;
      if (next) pdfRef.current?.renderThumbnails();
      return next;
    });
    if (showToolbar) setShowToolbar(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Favorite ──────────────────────────────────────────────────────────
  function handleFavorite() {
    if (!file) return;
    toggleFavorite(file.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // ── Search ────────────────────────────────────────────────────────────
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

  // ── Notes ─────────────────────────────────────────────────────────────
  function handleLongPress(page: number, x: number, y: number, pdfX?: number, pdfY?: number) {
    if (!file) return;
    pendingNotePos.current = { page, x, y, pdfX, pdfY };
    activeNoteId.current = null;
    setNoteInitialText(""); setNoteInitialColor("#FFEB3B");
    setNoteModalEditing(false); setNoteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  function handleNoteTap(noteId: string) {
    if (!file) return;
    const note = file.notes[noteId];
    if (!note) return;
    activeNoteId.current = noteId; pendingNotePos.current = null;
    setNoteInitialText(note.text); setNoteInitialColor(note.color);
    setNoteModalEditing(true); setNoteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  async function handleNoteSave(text: string, color: string) {
    if (!file) return;
    setNoteModalVisible(false);
    if (noteModalEditing && activeNoteId.current) {
      const noteId = activeNoteId.current;
      await updateNote(file.id, noteId, text, color);
      pdfRef.current?.updateNote?.(noteId, color, text);
    } else if (pendingNotePos.current) {
      const pos = pendingNotePos.current;
      const newNote: StickyNote = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        page: pos.page,
        x: pos.x,
        y: pos.y,
        pdfX: pos.pdfX,
        pdfY: pos.pdfY,
        color,
        text,
        createdAt: Date.now(),
      };
      await addNote(file.id, newNote);
      pdfRef.current?.addNote?.(newNote);
    }
    activeNoteId.current = null; pendingNotePos.current = null;
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
    activeNoteId.current = null; pendingNotePos.current = null;
  }

  // ── Password ──────────────────────────────────────────────────────────
  function handlePasswordRequired(retry: boolean) {
    setPwdRetry(retry); setPwdInput(""); setPwdVisible(true);
  }
  function submitPassword() {
    if (!pwdInput.trim()) return;
    pdfRef.current?.setPassword(pwdInput.trim());
    setPwdVisible(false); setPwdInput("");
  }
  function cancelPassword() {
    setPwdVisible(false);
    setPwdInput("");
    pdfRef.current?.cancelPassword();
  }

  // ── Guard ─────────────────────────────────────────────────────────────
  if (!file) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, marginTop: 12, fontSize: 16 }}>File not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const hasResults = searchResults.length > 0;
  const noResults = isSearching && !searchPending && searchQuery.length > 0 && !hasResults;
  return (
    <View style={[styles.container, { backgroundColor: "#EFEFEF" }]}>
      {Platform.OS !== "web" && (
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} hidden={!chromVisible} />
      )}

      {chromVisible && (
        <View style={[styles.topBar, { paddingTop: topInset, backgroundColor: barBg, borderBottomColor: barLine }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={isSearching ? closeSearch : () => navigation.goBack()}
              style={styles.headerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={isSearching ? "x" : "chevron-left"} size={26} color={ink} />
            </TouchableOpacity>

            {isSearching ? (
              <View style={[styles.searchInputWrap, { backgroundColor: chipBg, borderColor: chipLine }]}>
                <Feather name="search" size={14} color={inkMuted} />
                <TextInput
                  ref={searchInputRef}
                  style={[styles.searchInput, { color: ink }]}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder="Search in document"
                  placeholderTextColor={inkMuted}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={() => { if (searchQuery.trim()) pdfRef.current?.search?.(searchQuery.trim()); }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearchChange("")}>
                    <Feather name="x-circle" size={14} color={inkMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ) : showPageInput ? (
              <View style={styles.titleBlock}>
                <View style={styles.pageJump}>
                  <TextInput
                    ref={pageInputRef}
                    style={[styles.goToPageInput, { color: ink }]}
                    value={pageInputValue}
                    onChangeText={setPageInputValue}
                    keyboardType="number-pad"
                    returnKeyType="go"
                    onSubmitEditing={submitPageInput}
                    selectTextOnFocus
                    maxLength={6}
                  />
                  <Text style={[styles.pageMeta, { color: inkMuted }]}>/ {totalPages}</Text>
                  <TouchableOpacity onPress={submitPageInput} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Feather name="arrow-right" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closePageInput} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Feather name="x" size={14} color={inkMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.titleBlock} onPress={openPageInput} disabled={!totalPages}>
                <Text style={[styles.headerTitle, { color: ink }]} numberOfLines={1}>
                  {file.name.replace(/\.pdf$/i, "")}
                </Text>
                {totalPages > 0 && (
                  <Text style={[styles.pageMeta, { color: inkMuted }]}>{currentPage} / {totalPages}</Text>
                )}
              </TouchableOpacity>
            )}

            {!isSearching && (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={openSearch} style={styles.headerBtn} accessibilityLabel="Search">
                  <Feather name="search" size={20} color={ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.headerBtn} accessibilityLabel="More">
                  <Feather name="more-vertical" size={20} color={ink} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {showZoomControls && (
            <View style={[styles.zoomPanel, { backgroundColor: barBg, borderBottomColor: barLine }]}>
              <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: chipBg, borderColor: chipLine }]} onPress={() => pdfRef.current?.zoomOut()}>
                <Feather name="zoom-out" size={18} color={ink} />
              </TouchableOpacity>
              <Text style={[styles.zoomText, { color: ink }]}>{zoomPct}%</Text>
              <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: chipBg, borderColor: chipLine }]} onPress={() => pdfRef.current?.zoomIn()}>
                <Feather name="zoom-in" size={18} color={ink} />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={[styles.zoomPresetBtn, { backgroundColor: chipBg, borderColor: chipLine }]} onPress={() => pdfRef.current?.zoomFitWidth()}>
                <Text style={[styles.zoomPresetText, { color: ink }]}>Fit width</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.zoomPresetBtn, { backgroundColor: chipBg, borderColor: chipLine }]} onPress={() => pdfRef.current?.zoomFitPage()}>
                <Text style={[styles.zoomPresetText, { color: ink }]}>Fit page</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSearching && (
            <View style={[styles.searchBar, { backgroundColor: barBg, borderBottomColor: barLine }]}>
              {searchPending ? (
                <Text style={[styles.searchStatus, { color: inkMuted }]}>Searching…</Text>
              ) : noResults ? (
                <Text style={[styles.searchStatus, { color: "#EF4444" }]}>No results</Text>
              ) : hasResults ? (
                <>
                  <TouchableOpacity onPress={goToPrevResult} style={[styles.resultNavBtn, { backgroundColor: chipBg, borderColor: chipLine }]}>
                    <Feather name="chevron-up" size={18} color={ink} />
                  </TouchableOpacity>
                  <Text style={[styles.searchResultCount, { color: ink }]}>
                    {searchResultIdx + 1} of {searchResults.length}
                    <Text style={{ color: colors.primary }}>
                      {"  ·  "}{searchResults[searchResultIdx]?.count ?? 0} match{(searchResults[searchResultIdx]?.count ?? 0) !== 1 ? "es" : ""}
                    </Text>
                  </Text>
                  <TouchableOpacity onPress={goToNextResult} style={[styles.resultNavBtn, { backgroundColor: chipBg, borderColor: chipLine }]}>
                    <Feather name="chevron-down" size={18} color={ink} />
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.searchStatus, { color: inkMuted }]}>Find a word in this document</Text>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.pdfArea}>
        <PDFViewer
          ref={pdfRef}
          fileUri={file.uri}
          darkMode={isDark}
          annotations={file.annotations ?? {}}
          markup={file.markup ?? {}}
          formValues={file.formValues ?? {}}
          onPageChange={handlePageChange}
          onLoaded={handleLoaded}
          onSlotsReady={handleSlotsReady}
          onTap={showChrom}
          onMarkupChange={handleMarkupChange}
          onFormChange={handleFormChange}
          onSearchDone={handleSearchDone}
          onThumbnailReady={handleThumbnailReady}
          onLongPress={(page, x, y, pdfX, pdfY) => handleLongPress(page, x, y, pdfX, pdfY)}
          onNoteTap={handleNoteTap}
          onOutlineReady={setOutlineItems}
          onScaleChange={setZoomPct}
          onPasswordRequired={handlePasswordRequired}
          onUndoAvailable={setCanUndo}
        />
      </View>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.menuBackdrop}>
          <TouchableOpacity style={styles.menuDismiss} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={[styles.menuSheet, { backgroundColor: colors.card, paddingBottom: bottomInset + 12 }]}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Document</Text>
            {([
              { icon: isDark ? "sun" : "moon", label: isDark ? "Light mode" : "Dark mode", run: () => { setShowMenu(false); toggleTheme(); } },
              { icon: "zoom-in", label: showZoomControls ? "Hide zoom" : "Zoom", run: () => { setShowMenu(false); toggleZoom(); } },
              { icon: "rotate-cw", label: "Rotate", run: () => { setShowMenu(false); handleRotate(); } },
              { icon: viewMode === "continuous" ? "square" : "align-justify", label: viewMode === "continuous" ? "One page at a time" : "Continuous scroll", run: () => { setShowMenu(false); handleViewMode(); } },
              { icon: "grid", label: showThumbs ? "Hide page previews" : "Page previews", run: () => { setShowMenu(false); toggleThumbs(); } },
              ...(outlineItems.length > 0 ? [{ icon: "list", label: "Contents", run: () => { setShowMenu(false); openOutline(); } }] : []),
              { icon: "bookmark", label: file.isFavorite ? "Remove bookmark" : "Bookmark", run: () => { setShowMenu(false); handleFavorite(); } },
              { icon: "edit-2", label: showToolbar ? "Close markup" : "Markup", run: () => { setShowMenu(false); setShowToolbar((s) => !s); if (showThumbs) setShowThumbs(false); } },
              { icon: "share-2", label: "Share", run: () => { setShowMenu(false); setShowShare(true); } },
            ] as { icon: string; label: string; run: () => void }[]).map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.run}>
                <Feather name={item.icon} size={18} color={colors.primary} />
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Annotation toolbar ───────────────────────────────────────────── */}
      {showToolbar && !isSearching && (
        <View style={[styles.toolbar, { bottom: (showThumbs ? STRIP_H : 0) + bottomInset }]}>
          <AnnotationToolbar
            activeTool={activeTool}
            activeColor={activeColor}
            shapeType={shapeType}
            stampType={stampType}
            canUndo={canUndo}
            onToolChange={handleTool}
            onColorChange={handleColor}
            onShapeTypeChange={handleShapeType}
            onStampTypeChange={handleStampType}
            onUndo={handleUndo}
            onOpenColorPicker={() => setShowColorPicker(true)}
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

      {/* ── Outline panel ───────────────────────────────────────────────── */}
      {(showOutline || outlineItems.length > 0) && (
        <>
          {showOutline && (
            <TouchableOpacity style={styles.outlineBackdrop} activeOpacity={1} onPress={closeOutline} />
          )}
          <OutlinePanel
            items={outlineItems}
            visible={showOutline}
            slideAnim={outlineAnim}
            onNavigate={handleOutlineNavigate}
            onClose={closeOutline}
          />
        </>
      )}

      {/* ── Color picker ────────────────────────────────────────────────── */}
      <ColorPickerModal
        visible={showColorPicker}
        currentColor={activeColor}
        onSelect={handleColor}
        onClose={() => setShowColorPicker(false)}
      />

      {/* ── Share sheet ─────────────────────────────────────────────────── */}
      {showShare && (
        <ShareSheet visible={showShare} file={file} onClose={() => setShowShare(false)} />
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

      {/* ── Password dialog (native fallback) ──────────────────────────── */}
      <Modal visible={pwdVisible} transparent animationType="fade" onRequestClose={cancelPassword}>
        <View style={styles.pwdOverlay}>
          <View style={[styles.pwdBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.pwdTitle, { color: colors.foreground }]}>🔒 Password Required</Text>
            <Text style={[styles.pwdMsg, { color: colors.mutedForeground }]}>
              {pwdRetry ? "Incorrect password. Try again." : "This PDF is password-protected."}
            </Text>
            <TextInput
              style={[styles.pwdInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={pwdInput}
              onChangeText={setPwdInput}
              placeholder="Enter password…"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitPassword}
            />
            <View style={styles.pwdBtns}>
              <TouchableOpacity onPress={cancelPassword} style={[styles.pwdBtn, styles.pwdBtnCancel, { borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitPassword} style={[styles.pwdBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "white", fontWeight: "700" }}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdfArea: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  backLink: { marginTop: 12, padding: 8 },

  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(220,38,38,0.18)",
  },
  header: {
    height: 52,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 2,
  },
  headerBtn: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  headerTitle: { color: "#1A1A1A", fontSize: 15, fontWeight: "600" },
  pageMeta: { fontSize: 12, marginTop: 1 },
  pageJump: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  zoomBadge: { color: "#1A1A1A", fontSize: 11, fontWeight: "700", minWidth: 36, textAlign: "center" },

  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(220,38,38,0.28)",
    paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 4, gap: 6,
  },
  searchInput: { flex: 1, color: "#1A1A1A", fontSize: 15, paddingVertical: 0 },

  zoomPanel: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(220,38,38,0.12)",
  },
  zoomBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(220,38,38,0.28)" },
  zoomText: { color: "#1A1A1A", fontSize: 14, fontWeight: "700", minWidth: 44, textAlign: "center" },
  zoomDivider: { width: 1, height: 20, backgroundColor: "rgba(220,38,38,0.30)", marginHorizontal: 4 },
  zoomPresetBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(220,38,38,0.28)" },
  zoomPresetText: { color: "#1A1A1A", fontSize: 11, fontWeight: "600" },

  searchBar: {
    height: 44,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 16, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(220,38,38,0.12)",
  },
  searchStatus: { color: "rgba(26,26,26,0.55)", fontSize: 13 },
  searchResultCount: { flex: 1, color: "#1A1A1A", fontSize: 13, textAlign: "center" },
  resultNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(220,38,38,0.28)" },

  goToPagePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 22, borderWidth: 1, borderColor: "rgba(220,38,38,0.45)",
    paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: "rgba(220,38,38,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40, shadowRadius: 10, elevation: 6,
  },
  goToPageInput: {
    color: "#1A1A1A", fontSize: 15, fontWeight: "700",
    minWidth: 32, textAlign: "center", paddingVertical: 0,
  },
  goToPageSlash: { color: "rgba(26,26,26,0.55)", fontSize: 12 },
  goToPageBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center", justifyContent: "center",
  },
  goToPageClose: { paddingLeft: 2 },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  menuDismiss: { ...StyleSheet.absoluteFillObject },
  menuSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 14, paddingHorizontal: 8 },
  menuTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.4, paddingHorizontal: 14, paddingBottom: 6 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14 },
  menuLabel: { fontSize: 16 },
  toolbar: { position: "absolute", left: 0, right: 0 },
  thumbsWrap: { position: "absolute", left: 0, right: 0 },

  outlineBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  pwdOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  pwdBox: { borderRadius: 16, padding: 24, width: 300, gap: 14 },
  pwdTitle: { fontSize: 17, fontWeight: "700" },
  pwdMsg: { fontSize: 13 },
  pwdInput: { borderWidth: 1.5, borderRadius: 9, padding: 11, fontSize: 14 },
  pwdBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  pwdBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 9, paddingVertical: 11 },
  pwdBtnCancel: { borderWidth: 1.5 },
});

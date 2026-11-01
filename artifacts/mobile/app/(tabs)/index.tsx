import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Feather from "react-native-vector-icons/Feather";
import * as Haptics from "@/utils/haptics";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import FileCard from "@/components/FileCard";
import SearchBar from "@/components/SearchBar";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import type { RootStackParamList } from "@/navigation/types";
import { PDFFile } from "@/types/pdf";
import { importPdfFromPicker } from "@/utils/importPdf";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { files, addFile, removeFile, toggleFavorite } = useLibrary();
  const { seeding, seed } = useSeedLibrary();
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const recents = [...files]
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, 6);

  async function handleImport() {
    try {
      setImporting(true);
      const picked = await importPdfFromPicker();
      if (!picked) return;

      await addFile({
        name: picked.name,
        uri: picked.uri,
        size: picked.size,
        pageCount: 0,
        folderId: null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not import PDF";
      Alert.alert("Import Failed", msg);
    } finally {
      setImporting(false);
    }
  }

  function handleFilePress(file: PDFFile) {
    navigation.navigate("Viewer", { id: file.id });
  }

  function handleFileLongPress(file: PDFFile) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(file.name.replace(/\.pdf$/i, ""), undefined, [
      {
        text: file.isFavorite ? "Remove from Favorites" : "Add to Favorites",
        onPress: () => toggleFavorite(file.id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Delete File",
            "Remove this PDF from your library?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => removeFile(file.id),
              },
            ]
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              accessibilityLabel="GK"
            />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Library
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleImport}
            style={[
              styles.importBtn,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.55,
                shadowRadius: 10,
                elevation: 6,
              },
            ]}
            disabled={importing}
            activeOpacity={0.78}
          >
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.importBtnText}>
              {importing ? "Importing…" : "Import PDF"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: btmPad + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBar value={search} onChangeText={setSearch} />

        {!search && recents.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.foreground }]}
            >
              Recent
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recents.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  onPress={() => handleFilePress(file)}
                  style={[
                    styles.recentCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.72}
                >
                  <View
                    style={[
                      styles.recentIcon,
                      { backgroundColor: colors.primary + "18" },
                    ]}
                  >
                    <Feather name="file-text" size={22} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.recentName,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={3}
                  >
                    {file.name.replace(/\.pdf$/i, "")}
                  </Text>
                  {file.pageCount > 0 && (
                    <View
                      style={[
                        styles.progressMini,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressMiniFill,
                          {
                            width: `${(file.lastPage / file.pageCount) * 100}%` as `${number}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {search ? `Results (${filtered.length})` : "All Files"}
          </Text>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="file-text"
                title={search ? "No results" : "No PDFs yet"}
                subtitle={
                  search
                    ? "Try a different search term"
                    : 'Tap "Import PDF" to add your first document'
                }
              />
              {!search && (
                <TouchableOpacity
                  onPress={seed}
                  disabled={seeding}
                  style={[styles.sampleBtn, { borderColor: colors.primary }]}
                  activeOpacity={0.7}
                >
                  <Feather name="book-open" size={15} color={colors.primary} />
                  <Text style={[styles.sampleBtnText, { color: colors.primary }]}>
                    {seeding ? "Loading sample…" : "Try Sample PDF"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPress={() => handleFilePress(file)}
                onLongPress={() => handleFileLongPress(file)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  importBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  section: { marginBottom: 26 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  recentScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  recentCard: {
    width: 136,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  recentIcon: {
    width: 42,
    height: 50,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  recentName: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  progressMini: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressMiniFill: { height: "100%", borderRadius: 2 },
  emptyWrap: { alignItems: "center" },
  sampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  sampleBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

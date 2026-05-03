import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { PDFFile } from "@/types/pdf";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { files, addFile, removeFile, toggleFavorite } = useLibrary();
  const { seeding } = useSeedLibrary();
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
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const dir = (FileSystem.documentDirectory ?? "") + "pdfs/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const filename = `${Date.now()}_${asset.name ?? "document.pdf"}`;
      const destUri = dir + filename;
      await FileSystem.copyAsync({ from: asset.uri, to: destUri });

      await addFile({
        name: asset.name ?? "document.pdf",
        uri: destUri,
        size: asset.size ?? 0,
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
    router.push(`/viewer/${file.id}` as never);
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Library
          </Text>
          <TouchableOpacity
            onPress={handleImport}
            style={[styles.importBtn, { backgroundColor: colors.primary }]}
            disabled={importing}
            activeOpacity={0.8}
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
            <EmptyState
              icon="file-text"
              title={search ? "No results" : "No PDFs yet"}
              subtitle={
                search
                  ? "Try a different search term"
                  : 'Tap "Import PDF" to add your first document'
              }
            />
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
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  section: { marginBottom: 26 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
  progressMini: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressMiniFill: { height: "100%", borderRadius: 2 },
});

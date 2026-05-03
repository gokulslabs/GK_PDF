import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { PDFFile } from "@/types/pdf";

interface Props {
  file: PDFFile;
  onPress: () => void;
  onLongPress?: () => void;
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function FileCard({ file, onPress, onLongPress }: Props) {
  const colors = useColors();
  const progress =
    file.pageCount > 0 ? Math.min(file.lastPage / file.pageCount, 1) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      activeOpacity={0.72}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
        <Feather name="file-text" size={26} color={colors.primary} />
        {file.isFavorite && (
          <View style={styles.favBadge}>
            <Feather name="bookmark" size={9} color="#FBBF24" />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {file.name.replace(/\.pdf$/i, "")}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {formatDate(file.lastOpened)}
          </Text>
          {file.pageCount > 0 && (
            <>
              <Text style={[styles.dot, { color: colors.mutedForeground }]}>
                ·
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {file.lastPage}/{file.pageCount}p
              </Text>
            </>
          )}
          {!!file.size && (
            <>
              <Text style={[styles.dot, { color: colors.mutedForeground }]}>
                ·
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {formatSize(file.size)}
              </Text>
            </>
          )}
        </View>
        {file.pageCount > 0 && (
          <View
            style={[styles.progressBg, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%` as `${number}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        )}
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  iconWrap: {
    width: 50,
    height: 60,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  favBadge: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dot: { fontSize: 11 },
  progressBg: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
});

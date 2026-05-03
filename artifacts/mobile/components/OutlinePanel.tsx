import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { OutlineItem } from "@/types/pdf";

interface Props {
  items: OutlineItem[];
  visible: boolean;
  slideAnim: Animated.Value;
  onNavigate: (page: number) => void;
  onClose: () => void;
}

export default function OutlinePanel({ items, visible, slideAnim, onNavigate, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!visible && items.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: colors.card,
          paddingTop: topPad,
          transform: [{ translateX: slideAnim }],
          borderRightColor: colors.border,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Contents</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="list" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No outline available</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { onNavigate(item.page); onClose(); }}
              style={[styles.item, { paddingLeft: 16 + item.depth * 16 }]}
              activeOpacity={0.6}
            >
              {item.depth > 0 && (
                <View style={[styles.depthLine, { backgroundColor: colors.border }]} />
              )}
              <Text
                style={[
                  styles.itemText,
                  { color: item.depth === 0 ? colors.foreground : colors.mutedForeground },
                  item.depth === 0 && styles.itemTextBold,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {item.page > 0 && (
                <Text style={[styles.pageNum, { color: colors.primary }]}>{item.page}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 100,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingVertical: 4, paddingBottom: 40 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 14,
    gap: 8,
  },
  depthLine: {
    width: 2,
    height: 14,
    borderRadius: 1,
    marginRight: 4,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  itemTextBold: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pageNum: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    minWidth: 24,
    textAlign: "right",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

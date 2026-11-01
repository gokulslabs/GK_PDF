import Feather from "react-native-vector-icons/Feather";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// 8 columns × 8 rows — organized by hue family
const PALETTE: string[] = [
  // Reds
  "#FFEBEE","#FFCDD2","#EF9A9A","#E57373","#EF5350","#F44336","#C62828","#7F0000",
  // Pinks / Rose
  "#FCE4EC","#F8BBD0","#F48FB1","#F06292","#EC407A","#E91E63","#880E4F","#4A0028",
  // Purples
  "#F3E5F5","#E1BEE7","#CE93D8","#BA68C8","#AB47BC","#9C27B0","#6A1B9A","#38006B",
  // Indigo / Blue
  "#E8EAF6","#C5CAE9","#9FA8DA","#7986CB","#5C6BC0","#3F51B5","#283593","#1A237E",
  // Blues
  "#E3F2FD","#BBDEFB","#90CAF9","#64B5F6","#42A5F5","#2196F3","#1565C0","#0D47A1",
  // Teals / Cyans
  "#E0F2F1","#B2DFDB","#80CBC4","#4DB6AC","#26A69A","#009688","#00695C","#004D40",
  // Greens
  "#E8F5E9","#C8E6C9","#A5D6A7","#81C784","#66BB6A","#4CAF50","#2E7D32","#1B5E20",
  // Yellows / Oranges / Browns
  "#FFFDE7","#FFF176","#FFEB3B","#FDD835","#FF9800","#F57C00","#E65100","#BF360C",
  // Neutrals / Black-White
  "#FFFFFF","#F5F5F5","#E0E0E0","#BDBDBD","#9E9E9E","#616161","#212121","#000000",
];

const RECENTS_MAX = 8;

interface Props {
  visible: boolean;
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

export default function ColorPickerModal({ visible, currentColor, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [hex, setHex] = useState(currentColor);
  const [preview, setPreview] = useState(currentColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setHex(currentColor);
      setPreview(currentColor);
    }
  }, [visible, currentColor]);

  function handleHexChange(text: string) {
    setHex(text);
    const clean = text.startsWith("#") ? text : "#" + text;
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      setPreview(clean);
    }
  }

  function selectColor(color: string) {
    setPreview(color);
    setHex(color);
  }

  function applyColor(color: string) {
    const clean = color.startsWith("#") ? color : "#" + color;
    if (!/^#[0-9A-Fa-f]{6}$/.test(clean)) return;
    setRecentColors((prev) => {
      const without = prev.filter((c) => c.toLowerCase() !== clean.toLowerCase());
      return [clean, ...without].slice(0, RECENTS_MAX);
    });
    onSelect(clean);
    onClose();
  }

  function handleApply() {
    applyColor(preview);
  }

  const isValidHex = /^#?[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Color Picker</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Preview swatch + hex input */}
          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: preview, borderColor: colors.border }]} />
            <View style={styles.hexWrap}>
              <Text style={[styles.hexLabel, { color: colors.mutedForeground }]}>HEX</Text>
              <TextInput
                style={[styles.hexInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: isValidHex ? colors.primary : "#EF4444" }]}
                value={hex}
                onChangeText={handleHexChange}
                placeholder="#FFEB3B"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
              />
            </View>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: isValidHex ? colors.primary : colors.border }]}
              disabled={!isValidHex}
            >
              <Feather name="check" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent</Text>
              <View style={styles.swatchRow}>
                {recentColors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => selectColor(c)}
                    onLongPress={() => applyColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c, borderColor: colors.border },
                      preview.toLowerCase() === c.toLowerCase() && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Full palette grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Palette</Text>
          </View>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {Array.from({ length: Math.ceil(PALETTE.length / 8) }).map((_, row) => (
              <View key={row} style={styles.gridRow}>
                {PALETTE.slice(row * 8, row * 8 + 8).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => selectColor(c)}
                    onLongPress={() => applyColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c, borderColor: colors.border },
                      preview.toLowerCase() === c.toLowerCase() && styles.swatchSelected,
                    ]}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnCancel, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              disabled={!isValidHex}
            >
              <View style={[styles.miniSwatch, { backgroundColor: preview }]} />
              <Text style={{ color: "white", fontWeight: "700" }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SWATCH_SIZE = 32;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  title: { flex: 1, fontSize: 17, fontWeight: "700" },

  previewRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  previewSwatch: { width: 52, height: 52, borderRadius: 10, borderWidth: 1.5 },
  hexWrap: { flex: 1, gap: 4 },
  hexLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  hexInput: { borderWidth: 1.5, borderRadius: 8, padding: 9, fontSize: 15, fontWeight: "500" },
  applyBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.6, marginBottom: 8 },
  swatchRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  grid: { paddingBottom: 8 },
  gridRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: 6,
    borderWidth: 1,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },

  footer: { flexDirection: "row", gap: 10, marginTop: 16 },
  footerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 10, paddingVertical: 13, gap: 8 },
  footerBtnCancel: { borderWidth: 1.5 },
  miniSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
});

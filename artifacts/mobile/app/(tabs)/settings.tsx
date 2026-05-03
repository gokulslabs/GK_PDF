import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
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

import { ThemePreference, useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

interface RowProps {
  icon: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  danger?: boolean;
}

function SettingRow({ icon, label, subtitle, right, onPress, colors, danger }: RowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "#EF444418" : colors.primary + "18" }]}>
        <Feather
          name={icon as keyof typeof Feather.glyphMap}
          size={16}
          color={danger ? "#EF4444" : colors.primary}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: danger ? "#EF4444" : colors.foreground }]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null)}
    </TouchableOpacity>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "system", label: "Auto", icon: "smartphone" },
  { value: "dark", label: "Dark", icon: "moon" },
];

function ThemeSegment({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { preference, setPreference } = useTheme();

  return (
    <View style={[styles.segment, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      {THEME_OPTIONS.map((opt, i) => {
        const active = preference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setPreference(opt.value)}
            activeOpacity={0.7}
            style={[
              styles.segmentBtn,
              active && [styles.segmentBtnActive, { backgroundColor: colors.card, shadowColor: "#000" }],
              i < THEME_OPTIONS.length - 1 && styles.segmentBtnBorder,
            ]}
          >
            <Feather
              name={opt.icon as keyof typeof Feather.glyphMap}
              size={14}
              color={active ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? colors.primary : colors.mutedForeground },
                active && styles.segmentLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : 0;

  function handleClearLibrary() {
    Alert.alert(
      "Clear Library",
      "This will remove all PDFs from your library. The actual files will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("@pdf_library_v1");
              Alert.alert("Done", "Library cleared. Restart the app to apply.");
            } catch (_) {}
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: btmPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.themeRow}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="sun" size={16} color={colors.primary} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Theme</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Choose light, dark, or follow system
            </Text>
          </View>
        </View>
        <View style={styles.themeSegmentWrap}>
          <ThemeSegment colors={colors} />
        </View>
      </View>

      {/* ── Reader ─────────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>READER</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="bookmark"
          label="Remember Position"
          subtitle="Resumes from last page"
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="edit-2"
          label="Annotations"
          subtitle="Draw, highlight, and add notes"
          colors={colors}
        />
      </View>

      {/* ── Storage ────────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>STORAGE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="trash-2"
          label="Clear Library"
          subtitle="Remove all files from library"
          colors={colors}
          onPress={handleClearLibrary}
          danger
        />
      </View>

      {/* ── About ──────────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="info" label="Version" subtitle="1.0.0" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="file-text" label="PDF Engine" subtitle="PDF.js 3.11 via WebView" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="smartphone" label="Framework" subtitle="Expo SDK 54 (React Native)" colors={colors} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sectionLabel: {
    fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8, marginHorizontal: 20, marginBottom: 8, marginTop: 24,
  },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },

  themeRow: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 13, paddingHorizontal: 14, gap: 12,
  },
  themeSegmentWrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  segment: {
    flexDirection: "row", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden", padding: 3, gap: 2,
  },
  segmentBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, gap: 5,
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  segmentBtnBorder: {},
  segmentLabel: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  segmentLabelActive: { fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 14, gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium", fontWeight: "500" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
});

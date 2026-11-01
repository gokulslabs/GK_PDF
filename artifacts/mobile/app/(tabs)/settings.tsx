import Feather from "react-native-vector-icons/Feather";
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

import { useLibrary } from "@/context/LibraryContext";
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
  const { clearLibrary } = useLibrary();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : 0;

  function handleClearLibrary() {
    Alert.alert(
      "Clear Library",
      "Imported PDFs and their notes will be removed from this device. The sample can be added again from the library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void clearLibrary();
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
          subtitle="Always on. Reopens on the last page you read"
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="edit-2"
          label="Annotations"
          subtitle="Ink, highlights, text, and notes stay on this device"
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
        <SettingRow icon="file-text" label="PDF Engine" subtitle="PDF.js 3.11, stored in the app" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="smartphone" label="Framework" subtitle="React Native 0.81" colors={colors} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: "700" },
  sectionLabel: {
    fontSize: 11, fontWeight: "600",
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
  segmentLabel: { fontSize: 13, fontWeight: "500" },
  segmentLabelActive: { fontWeight: "600" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 14, gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
});

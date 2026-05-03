import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useLibrary } from "@/context/LibraryContext";

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
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? "#EF444418" : colors.primary + "18" },
        ]}
      >
        <Feather
          name={icon as keyof typeof Feather.glyphMap}
          size={16}
          color={danger ? "#EF4444" : colors.primary}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text
          style={[
            styles.rowLabel,
            { color: danger ? "#EF4444" : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : 0;

  function handleClearRecent() {
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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Settings
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        READER
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SettingRow
          icon="moon"
          label="Dark Mode"
          subtitle={isDark ? "Dark — follows system" : "Light — follows system"}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
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

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        STORAGE
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SettingRow
          icon="trash-2"
          label="Clear Library"
          subtitle="Remove all files from library"
          colors={colors}
          onPress={handleClearRecent}
          danger
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        ABOUT
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SettingRow
          icon="info"
          label="Version"
          subtitle="1.0.0"
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="file-text"
          label="PDF Engine"
          subtitle="PDF.js 3.11 via WebView"
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="smartphone"
          label="Framework"
          subtitle="Expo SDK 54 (React Native)"
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 24,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});

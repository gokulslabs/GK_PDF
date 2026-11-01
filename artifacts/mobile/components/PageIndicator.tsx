import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  current: number;
  total: number;
}

export default function PageIndicator({ current, total }: Props) {
  const colors = useColors();
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isDark ? "rgba(42,18,18,0.94)" : "rgba(255,255,255,0.96)",
          borderColor: isDark ? "rgba(239,68,68,0.55)" : "rgba(220,38,38,0.35)",
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.foreground }]}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "rgba(220,38,38,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

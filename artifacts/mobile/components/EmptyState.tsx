import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather
          name={icon as keyof typeof Feather.glyphMap}
          size={36}
          color={colors.mutedForeground}
        />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 40,
    minHeight: 280,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
});

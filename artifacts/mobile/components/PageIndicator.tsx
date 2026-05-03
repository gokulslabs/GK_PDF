import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  current: number;
  total: number;
}

export default function PageIndicator({ current, total }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: "rgba(11,11,15,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.35)",
    shadowColor: "rgba(139,92,246,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});

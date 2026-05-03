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
    backgroundColor: "rgba(0,0,0,0.58)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  text: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});

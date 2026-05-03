import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, TouchableOpacity, View, Platform } from "react-native";

import { useColors } from "@/hooks/useColors";
import { AnnotationTool } from "@/types/pdf";

const ANNOTATION_COLORS = [
  "#FFEB3B",
  "#4CAF50",
  "#2196F3",
  "#FF80AB",
  "#FF5252",
];

interface ToolDef {
  tool: AnnotationTool;
  icon: string;
  label: string;
}

const TOOLS: ToolDef[] = [
  { tool: "none", icon: "mouse-pointer", label: "Select" },
  { tool: "draw", icon: "pen-tool", label: "Draw" },
  { tool: "highlight", icon: "type", label: "Highlight" },
  { tool: "eraser", icon: "delete", label: "Eraser" },
];

interface Props {
  activeTool: AnnotationTool;
  activeColor: string;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
}

export default function AnnotationToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
}: Props) {
  const colors = useColors();

  function handleTool(tool: AnnotationTool) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToolChange(tool);
  }

  function handleColor(c: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onColorChange(c);
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        {TOOLS.map(({ tool, icon }) => (
          <TouchableOpacity
            key={tool}
            onPress={() => handleTool(tool)}
            style={[
              styles.toolBtn,
              activeTool === tool && {
                backgroundColor: colors.primary + "22",
                borderColor: colors.primary + "55",
                borderWidth: 1,
              },
            ]}
          >
            <Feather
              name={icon as keyof typeof Feather.glyphMap}
              size={20}
              color={activeTool === tool ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {ANNOTATION_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => handleColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              activeColor === c && styles.colorDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...(Platform.OS === "ios" ? { shadowColor: "#000", shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.08, shadowRadius: 4 } : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 1,
    height: 26,
    marginHorizontal: 4,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

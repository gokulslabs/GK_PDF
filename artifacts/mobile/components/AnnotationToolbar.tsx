import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { AnnotationTool, ShapeType } from "@/types/pdf";

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
  { tool: "underline", icon: "underline", label: "Underline" },
  { tool: "strikethrough", icon: "minus", label: "Strike" },
  { tool: "shape", icon: "maximize", label: "Shape" },
  { tool: "eraser", icon: "delete", label: "Eraser" },
];

interface ShapeDef {
  type: ShapeType;
  icon: string;
  label: string;
}

const SHAPE_TYPES: ShapeDef[] = [
  { type: "line", icon: "arrow-up-right", label: "Line" },
  { type: "rect", icon: "square", label: "Rect" },
  { type: "circle", icon: "circle", label: "Oval" },
];

interface Props {
  activeTool: AnnotationTool;
  activeColor: string;
  shapeType: ShapeType;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onShapeTypeChange: (type: ShapeType) => void;
}

export default function AnnotationToolbar({
  activeTool,
  activeColor,
  shapeType,
  onToolChange,
  onColorChange,
  onShapeTypeChange,
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
  function handleShapeType(t: ShapeType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShapeTypeChange(t);
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {/* Main tool row */}
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
              size={19}
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

      {/* Shape sub-row — only visible when shape tool is active */}
      {activeTool === "shape" && (
        <View style={[styles.subRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            Shape:
          </Text>
          {SHAPE_TYPES.map(({ type, icon, label }) => (
            <TouchableOpacity
              key={type}
              onPress={() => handleShapeType(type)}
              style={[
                styles.shapeBtn,
                shapeType === type && {
                  backgroundColor: colors.primary + "22",
                  borderColor: colors.primary + "55",
                  borderWidth: 1,
                },
              ]}
            >
              <Feather
                name={icon as keyof typeof Feather.glyphMap}
                size={16}
                color={shapeType === type ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.shapeBtnLabel,
                  { color: shapeType === type ? colors.primary : colors.mutedForeground },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.08, shadowRadius: 4 }
      : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 3,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginRight: 2,
  },
  shapeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shapeBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});

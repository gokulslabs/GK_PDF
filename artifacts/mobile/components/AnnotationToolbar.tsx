import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { AnnotationTool, ShapeType, StampType } from "@/types/pdf";

const ANNOTATION_COLORS = ["#FFEB3B", "#4CAF50", "#2196F3", "#FF80AB", "#FF5252", "#FF9800"];

interface ToolDef { tool: AnnotationTool; icon: string; label: string; }
const TOOLS: ToolDef[] = [
  { tool: "none",          icon: "mouse-pointer", label: "Select"    },
  { tool: "draw",          icon: "pen-tool",      label: "Draw"      },
  { tool: "highlight",     icon: "type",          label: "Highlight" },
  { tool: "underline",     icon: "underline",     label: "Underline" },
  { tool: "strikethrough", icon: "minus",         label: "Strike"    },
  { tool: "textbox",       icon: "type",          label: "Text"      },
  { tool: "shape",         icon: "maximize",      label: "Shape"     },
  { tool: "stamp",         icon: "award",         label: "Stamp"     },
  { tool: "eraser",        icon: "delete",        label: "Eraser"    },
];

interface ShapeDef { type: ShapeType; icon: string; label: string; }
const SHAPE_TYPES: ShapeDef[] = [
  { type: "line",   icon: "arrow-up-right", label: "Line"  },
  { type: "rect",   icon: "square",         label: "Rect"  },
  { type: "circle", icon: "circle",         label: "Oval"  },
  { type: "arrow",  icon: "arrow-right",    label: "Arrow" },
];

interface StampDef { type: StampType; label: string; color: string; }
const STAMP_TYPES: StampDef[] = [
  { type: "approved",     label: "Approved",     color: "#16a34a" },
  { type: "draft",        label: "Draft",        color: "#2563eb" },
  { type: "confidential", label: "Confidential", color: "#dc2626" },
  { type: "reviewed",     label: "Reviewed",     color: "#7c3aed" },
  { type: "urgent",       label: "Urgent",       color: "#ea580c" },
];

interface Props {
  activeTool: AnnotationTool;
  activeColor: string;
  shapeType: ShapeType;
  stampType: StampType;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onShapeTypeChange: (type: ShapeType) => void;
  onStampTypeChange: (type: StampType) => void;
}

export default function AnnotationToolbar({
  activeTool,
  activeColor,
  shapeType,
  stampType,
  onToolChange,
  onColorChange,
  onShapeTypeChange,
  onStampTypeChange,
}: Props) {
  const colors = useColors();

  function haptic() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Main tool row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TOOLS.map(({ tool, icon, label }) => (
          <TouchableOpacity
            key={tool}
            onPress={() => { haptic(); onToolChange(tool); }}
            style={[
              styles.toolBtn,
              activeTool === tool && { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55", borderWidth: 1 },
            ]}
          >
            <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={activeTool === tool ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: activeTool === tool ? colors.primary : colors.mutedForeground }]}>{label}</Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {ANNOTATION_COLORS.map((c) => (
          <TouchableOpacity key={c} onPress={() => { haptic(); onColorChange(c); }}
            style={[styles.colorDot, { backgroundColor: c }, activeColor === c && styles.colorDotActive]}
          />
        ))}
      </ScrollView>

      {/* Shape sub-row */}
      {activeTool === "shape" && (
        <View style={[styles.subRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Shape:</Text>
          {SHAPE_TYPES.map(({ type, icon, label }) => (
            <TouchableOpacity key={type} onPress={() => { haptic(); onShapeTypeChange(type); }}
              style={[styles.subBtn, shapeType === type && { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55", borderWidth: 1 }]}>
              <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={shapeType === type ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.subBtnLabel, { color: shapeType === type ? colors.primary : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stamp sub-row */}
      {activeTool === "stamp" && (
        <View style={[styles.subRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Stamp:</Text>
          {STAMP_TYPES.map(({ type, label, color }) => (
            <TouchableOpacity key={type} onPress={() => { haptic(); onStampTypeChange(type); }}
              style={[styles.subBtn, stampType === type && { backgroundColor: color + "18", borderColor: color + "66", borderWidth: 1 }]}>
              <Text style={[styles.subBtnLabel, { color: stampType === type ? color : colors.mutedForeground, fontWeight: stampType === type ? "700" : "500" }]}>{label}</Text>
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
    ...(Platform.OS === "ios" ? { shadowColor: "#000", shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.08, shadowRadius: 4 } : {}),
  },
  row: { flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 4 },
  toolBtn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, gap: 2, minWidth: 44 },
  toolLabel: { fontSize: 9, fontFamily: "Inter_500Medium", fontWeight: "500" },
  divider: { width: 1, height: 28, marginHorizontal: 4 },
  colorDot: { width: 22, height: 22, borderRadius: 11, marginHorizontal: 1 },
  colorDotActive: { borderWidth: 3, borderColor: "white", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
  subLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginRight: 2 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  subBtnLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" },
});

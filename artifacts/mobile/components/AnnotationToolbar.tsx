import Feather from "react-native-vector-icons/Feather";
import * as Haptics from "@/utils/haptics";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { AnnotationTool, ShapeType, StampType } from "@/types/pdf";

const QUICK_COLORS = ["#FFEB3B", "#4CAF50", "#2196F3", "#FF80AB", "#FF5252", "#FF9800"];

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
  canUndo: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onShapeTypeChange: (type: ShapeType) => void;
  onStampTypeChange: (type: StampType) => void;
  onUndo: () => void;
  onOpenColorPicker: () => void;
}

export default function AnnotationToolbar({
  activeTool,
  activeColor,
  shapeType,
  stampType,
  canUndo,
  onToolChange,
  onColorChange,
  onShapeTypeChange,
  onStampTypeChange,
  onUndo,
  onOpenColorPicker,
}: Props) {
  const colors = useColors();

  function haptic() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }

  const activeToolStyle = {
    backgroundColor: colors.primary + "22",
    borderColor: colors.primary + "66",
    borderWidth: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 7,
    elevation: 5,
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderTopColor: colors.primary + "30",
        borderTopWidth: 1,
      },
    ]}>
      {/* Main tool row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>

        {/* Undo button — leftmost */}
        <TouchableOpacity
          onPress={() => { if (canUndo) { haptic(); onUndo(); } }}
          style={[styles.toolBtn, styles.undoBtn, !canUndo && styles.undoBtnDisabled]}
          disabled={!canUndo}
        >
          <Feather name="corner-up-left" size={18} color={canUndo ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.toolLabel, { color: canUndo ? colors.primary : colors.mutedForeground }]}>Undo</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.primary + "25" }]} />

        {TOOLS.map(({ tool, icon, label }) => {
          const isActive = activeTool === tool;
          return (
            <TouchableOpacity
              key={tool}
              onPress={() => { haptic(); onToolChange(tool); }}
              style={[styles.toolBtn, isActive && activeToolStyle]}
            >
              <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={isActive ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.toolLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.divider, { backgroundColor: colors.primary + "25" }]} />

        {/* Quick color dots */}
        {QUICK_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => { haptic(); onColorChange(c); }}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              activeColor === c && [styles.colorDotActive, { shadowColor: c }],
            ]}
          />
        ))}

        {/* Full palette opener */}
        <TouchableOpacity
          onPress={() => { haptic(); onOpenColorPicker(); }}
          style={[styles.paletteBtn, { borderColor: activeColor }]}
        >
          <View style={[styles.paletteSwatch, { backgroundColor: activeColor }]} />
          <Feather name="chevron-up" size={11} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>

      {/* Shape sub-row */}
      {activeTool === "shape" && (
        <View style={[styles.subRow, { borderTopColor: colors.primary + "20" }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Shape:</Text>
          {SHAPE_TYPES.map(({ type, icon, label }) => {
            const isActive = shapeType === type;
            return (
              <TouchableOpacity key={type} onPress={() => { haptic(); onShapeTypeChange(type); }}
                style={[
                  styles.subBtn,
                  isActive && {
                    backgroundColor: colors.primary + "22",
                    borderColor: colors.primary + "66",
                    borderWidth: 1,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.45,
                    shadowRadius: 5,
                    elevation: 3,
                  },
                ]}>
                <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.subBtnLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Stamp sub-row */}
      {activeTool === "stamp" && (
        <View style={[styles.subRow, { borderTopColor: colors.primary + "20" }]}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Stamp:</Text>
          {STAMP_TYPES.map(({ type, label, color }) => {
            const isActive = stampType === type;
            return (
              <TouchableOpacity key={type} onPress={() => { haptic(); onStampTypeChange(type); }}
                style={[
                  styles.subBtn,
                  isActive && {
                    backgroundColor: color + "18",
                    borderColor: color + "66",
                    borderWidth: 1,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 5,
                    elevation: 3,
                  },
                ]}>
                <Text style={[styles.subBtnLabel, { color: isActive ? color : colors.mutedForeground, fontWeight: isActive ? "700" : "500" }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
    ...(Platform.OS === "ios" ? { shadowColor: "#DC2626", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.12, shadowRadius: 8 } : {}),
    elevation: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 4 },
  toolBtn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, gap: 2, minWidth: 44 },
  toolLabel: { fontSize: 9, fontWeight: "500" },
  undoBtn: { borderRadius: 9 },
  undoBtnDisabled: { opacity: 0.32 },
  divider: { width: 1, height: 28, marginHorizontal: 4 },
  colorDot: { width: 22, height: 22, borderRadius: 11, marginHorizontal: 1 },
  colorDotActive: {
    borderWidth: 3, borderColor: "white",
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 5,
  },
  paletteBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 4,
    borderRadius: 10, borderWidth: 2, marginLeft: 4,
  },
  paletteSwatch: { width: 16, height: 16, borderRadius: 8 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: "wrap" },
  subLabel: { fontSize: 11, marginRight: 2 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  subBtnLabel: { fontSize: 12, fontWeight: "500" },
});

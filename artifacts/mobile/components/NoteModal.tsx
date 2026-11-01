import Feather from "react-native-vector-icons/Feather";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const NOTE_COLORS = [
  { value: "#FFEB3B", label: "Yellow" },
  { value: "#4CAF50", label: "Green" },
  { value: "#60A5FA", label: "Blue" },
  { value: "#FF80AB", label: "Pink" },
  { value: "#FF8A65", label: "Orange" },
];

interface Props {
  visible: boolean;
  initialText?: string;
  initialColor?: string;
  isEditing?: boolean;
  onSave: (text: string, color: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function NoteModal({
  visible,
  initialText = "",
  initialColor = "#FFEB3B",
  isEditing = false,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const colors = useColors();
  const [text, setText] = useState(initialText);
  const [color, setColor] = useState(initialColor);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setText(initialText);
      setColor(initialColor);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible, initialText, initialColor]);

  function handleSave() {
    if (!text.trim()) {
      Alert.alert("Empty note", "Please write something before saving.");
      return;
    }
    onSave(text.trim(), color);
  }

  function handleDelete() {
    Alert.alert("Delete Note", "Remove this sticky note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.colorStripe,
                      { backgroundColor: color },
                    ]}
                  />
                  <Text
                    style={[styles.cardTitle, { color: colors.foreground }]}
                  >
                    {isEditing ? "Edit Note" : "New Note"}
                  </Text>
                  <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Color picker */}
                <View style={styles.colorRow}>
                  {NOTE_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => setColor(c.value)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.value },
                        color === c.value && styles.colorSwatchActive,
                      ]}
                    >
                      {color === c.value && (
                        <Feather name="check" size={12} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Text input */}
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Write your note here…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  returnKeyType="default"
                />

                {/* Actions */}
                <View style={styles.actions}>
                  {isEditing && onDelete ? (
                    <TouchableOpacity
                      onPress={handleDelete}
                      style={[styles.actionBtn, styles.deleteBtn]}
                    >
                      <Feather name="trash-2" size={15} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={onCancel}
                      style={[
                        styles.actionBtn,
                        { borderColor: colors.border, borderWidth: 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: colors.foreground },
                        ]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleSave}
                    style={[
                      styles.actionBtn,
                      styles.saveBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Feather name="check" size={15} color="white" />
                    <Text style={[styles.actionBtnText, { color: "white" }]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    overflow: "hidden",
    shadowColor: "rgba(139,92,246,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  colorStripe: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textInput: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 110,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  saveBtn: {},
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

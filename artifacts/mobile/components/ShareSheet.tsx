import Feather from "react-native-vector-icons/Feather";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { PDFFile } from "@/types/pdf";
import { annotatedPageNumbers } from "@/utils/flattenPdf";
import {
  copyAnnotationSummary,
  exportAnnotationPdf,
  shareAnnotatedPdf,
  sharePdfFile,
} from "@/utils/shareUtils";

interface Action {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  color?: string;
}

const ACTIONS: Action[] = [
  {
    id: "share_annotated",
    icon: "share",
    title: "Share annotated PDF",
    subtitle: "Send a copy with highlights, ink, text, and notes",
  },
  {
    id: "share_pdf",
    icon: "share-2",
    title: "Share original PDF",
    subtitle: "Send the file without marks",
  },
  {
    id: "copy_summary",
    icon: "clipboard",
    title: "Copy Annotation Summary",
    subtitle: "Copy sticky notes & marked pages as text",
  },
  {
    id: "export_pdf",
    icon: "file-text",
    title: "Export Annotations as PDF",
    subtitle: "A separate document listing notes and marked pages",
  },
];

interface Props {
  visible: boolean;
  file: PDFFile;
  onClose: () => void;
}

export default function ShareSheet({ visible, file, onClose }: Props) {
  const colors = useColors();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleAction(id: string) {
    setBusy(id);
    try {
      if (id === "share_annotated") {
        await shareAnnotatedPdf(file);
        onClose();
      } else if (id === "share_pdf") {
        await sharePdfFile(file);
        onClose();
      } else if (id === "copy_summary") {
        await copyAnnotationSummary(file);
        showToast("Copied to clipboard");
        setTimeout(onClose, 500);
      } else if (id === "export_pdf") {
        await exportAnnotationPdf(file);
        onClose();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      showToast(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Share &amp; Export
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {file.name.replace(/\.pdf$/i, "")}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {ACTIONS.map((action) => {
          const isBusy = busy === action.id;
          return (
            <TouchableOpacity
              key={action.id}
              onPress={() => handleAction(action.id)}
              disabled={busy !== null}
              style={[
                styles.action,
                { borderBottomColor: colors.border },
                isBusy && { opacity: 0.6 },
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name={action.icon} size={18} color={colors.primary} />
                )}
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.actionSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {action.subtitle}
                </Text>
              </View>
              {!isBusy && (
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.mutedForeground}
                />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Annotation stats */}
        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <StatBadge
            icon="message-square"
            count={Object.values(file.notes).length}
            label="notes"
            color={colors.primary}
          />
          <StatBadge
            icon="edit-2"
            count={annotatedPageNumbers(file).length}
            label="annotated pages"
            color="#4CAF50"
          />
        </View>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.toastText, { color: colors.background }]}>
              {toast}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function StatBadge({
  icon,
  count,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  count: number;
  label: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.statBadge}>
      <Feather name={icon} size={13} color={color} />
      <Text style={[styles.statText, { color: colors.mutedForeground }]}>
        <Text style={{ color: colors.foreground }}>
          {count}
        </Text>
        {" "}
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 36,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
  },
  toast: {
    position: "absolute",
    bottom: 52,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 13,
  },
});

import React from "react";
import { Modal, View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  warning?: boolean;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  warning = false,
}: ConfirmDialogProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.overlay, warning && { backgroundColor: "rgba(0, 0, 0, 0.7)" }]}
        onPress={onCancel}
      >
        <Pressable
          style={[
            styles.dialog,
            { backgroundColor: theme.backgroundDefault },
            warning && {
              borderWidth: 2,
              borderColor: theme.error,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {warning && (
            <View style={[styles.warningIcon, { backgroundColor: theme.error + "20" }]}>
              <Feather name="alert-triangle" size={32} color={theme.error} />
            </View>
          )}
          <ThemedText 
            type="h3" 
            style={[
              styles.title,
              warning && { color: theme.error, fontWeight: "700" },
            ]}
          >
            {title}
          </ThemedText>
          <ThemedText
            type="body"
            style={[
              styles.message,
              { color: theme.textSecondary },
              warning && { color: theme.text, fontWeight: "500", fontSize: 16 },
            ]}
          >
            {message}
          </ThemedText>
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText style={styles.cancelButtonText}>
                {cancelText}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: destructive ? theme.error : theme.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.confirmButtonText}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  message: {
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "flex-end",
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {},
  confirmButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});


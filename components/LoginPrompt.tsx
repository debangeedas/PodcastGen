import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface LoginPromptProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginPrompt({ visible, onClose, onSuccess }: LoginPromptProps) {
  const { theme, isDark } = useTheme();
  const { signInWithApple, isAppleAuthAvailable } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const success = await signInWithApple();
    setIsLoading(false);
    
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.preventClose} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.container,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              hitSlop={12}
            >
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="user" size={40} color={theme.primary} />
            </View>

            <ThemedText type="h2" style={styles.title}>
              Sign in to Continue
            </ThemedText>

            <ThemedText
              type="body"
              style={[styles.description, { color: theme.textSecondary }]}
            >
              Create an account to generate podcasts and save your favorites.
            </ThemedText>

            {Platform.OS === "ios" && isAppleAuthAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={BorderRadius.md}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            ) : (
              <View style={styles.fallbackContainer}>
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="smartphone" size={20} color={theme.primary} />
                  <ThemedText
                    type="small"
                    style={[styles.infoText, { color: theme.textSecondary }]}
                  >
                    Sign in with Apple is available on iOS. You can continue as a guest or use this app in Expo Go on your iPhone.
                  </ThemedText>
                </View>
                
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onClose();
                    onSuccess();
                  }}
                  style={({ pressed }) => [
                    styles.continueButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Continue as Guest
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : null}
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
    padding: Spacing.xl,
  },
  preventClose: {
    width: "100%",
    maxWidth: 400,
  },
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  fallbackContainer: {
    width: "100%",
    gap: Spacing.lg,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
  continueButton: {
    width: "100%",
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});

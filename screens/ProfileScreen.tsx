import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, Switch, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, AuthMethod } from "@/contexts/AuthContext.firebase";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import Spacer from "@/components/Spacer";
import {
  getSettings,
  saveSettings,
  UserSettings,
  defaultSettings,
  clearAllData,
} from "@/utils/storage";
import LoginPrompt from "@/components/LoginPrompt";
import ConfirmDialog from "@/components/ConfirmDialog";
import { playVoicePreview, stopVoicePreview } from "@/utils/voicePreview";

const QUALITY_OPTIONS = [
  { value: "standard" as const, label: "Standard" },
  { value: "high" as const, label: "High" },
  { value: "premium" as const, label: "Premium" },
];

const VOICE_OPTIONS = [
  { value: "onyx" as const, label: "Onyx (Deep)" },
  { value: "alloy" as const, label: "Alloy (Friendly)" },
  { value: "echo" as const, label: "Echo (Warm)" },
  { value: "fable" as const, label: "Fable (Storyteller)" },
  { value: "nova" as const, label: "Nova (Energetic)" },
  { value: "shimmer" as const, label: "Shimmer (Clear)" },
];

const DEPTH_OPTIONS = [
  { value: "quick" as const, label: "Quick (2-3 min)", description: "Brief overview" },
  { value: "standard" as const, label: "Standard (5-7 min)", description: "Balanced coverage" },
  { value: "deep" as const, label: "Deep Dive (10-12 min)", description: "Comprehensive exploration" },
];

const TONE_OPTIONS = [
  { value: "conversational" as const, label: "Conversational", description: "Casual and friendly" },
  { value: "educational" as const, label: "Educational", description: "Structured and informative" },
  { value: "storytelling" as const, label: "Storytelling", description: "Narrative-driven" },
];

const getAuthMethodLabel = (method: AuthMethod | undefined): string => {
  switch (method) {
    case "apple":
      return "Signed in with Apple";
    case "google":
      return "Signed in with Google";
    case "email":
      return "Signed in with Email";
    default:
      return "Signed in";
  }
};

const getAuthMethodIcon = (method: AuthMethod | undefined): "user" | "mail" => {
  switch (method) {
    case "email":
      return "mail";
    default:
      return "user";
  }
};

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, signInWithApple, signOut, isAppleAuthAvailable } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const data = await getSettings();
    setSettings(data);
  }, []);

  const handleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await signInWithApple();
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Sign In Failed", result.error || "Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSignOutDialog(true);
  };

  const confirmSignOut = async () => {
    try {
      setShowSignOutDialog(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signOut();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        "Failed to sign out. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
    await saveSettings(newSettings);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePreviewVoice = async (voiceName: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // If already previewing this voice, stop it
      if (previewingVoice === voiceName) {
        await stopVoicePreview();
        setPreviewingVoice(null);
        return;
      }

      // Stop any other preview and start this one
      setPreviewingVoice(voiceName);
      await playVoicePreview(voiceName);

      // Reset state after preview (it auto-stops when done)
      setTimeout(() => {
        setPreviewingVoice(null);
      }, 10000); // Previews are ~8-10 seconds
    } catch (error) {
      console.error("Voice preview error:", error);
      setPreviewingVoice(null);
      Alert.alert(
        "Preview Failed",
        "Unable to play voice preview. Please check your internet connection.",
        [{ text: "OK" }]
      );
    }
  };

  const handleClearData = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowClearDataDialog(true);
  };

  const confirmClearData = async () => {
    try {
      setShowClearDataDialog(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await clearAllData();
      setSettings(defaultSettings);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Done", "All data has been cleared.");
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        "Failed to clear data. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <>
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.sm} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Account
      </ThemedText>
      <Spacer height={Spacing.md} />

      {isAuthenticated && user ? (
        <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
              <Feather name={getAuthMethodIcon(user.authMethod)} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.userDetails}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {user.fullName || "Podcast Creator"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {user.email || getAuthMethodLabel(user.authMethod)}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: theme.error + "15",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="log-out" size={16} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, marginLeft: Spacing.sm }}>
              Sign Out
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.signInPrompt}>
            <View style={[styles.userAvatar, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="user" size={24} color={theme.textSecondary} />
            </View>
            <View style={styles.userDetails}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Not signed in
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Sign in to create podcasts
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowLoginPrompt(true);
            }}
            style={({ pressed }) => [
              styles.signInButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Sign In
            </ThemedText>
          </Pressable>
        </View>
      )}
      
      <LoginPrompt
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onSuccess={() => setShowLoginPrompt(false)}
      />

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Content Preferences
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
        Set your default preferences for podcast creation
      </ThemedText>

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ marginBottom: Spacing.md, fontWeight: "600" }}>
          Episode Length
        </ThemedText>
        <View style={styles.optionsColumn}>
          {DEPTH_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => updateSetting("preferredDepth", option.value)}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor:
                    settings.preferredDepth === option.value
                      ? theme.primary + "15"
                      : "transparent",
                  borderWidth: 1,
                  borderColor:
                    settings.preferredDepth === option.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.optionContent}>
                <ThemedText
                  type="body"
                  style={{
                    fontWeight: settings.preferredDepth === option.value ? "600" : "400",
                  }}
                >
                  {option.label}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {option.description}
                </ThemedText>
              </View>
              {settings.preferredDepth === option.value && (
                <Feather name="check-circle" size={20} color={theme.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ marginBottom: Spacing.md, fontWeight: "600" }}>
          Tone & Style
        </ThemedText>
        <View style={styles.optionsColumn}>
          {TONE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => updateSetting("preferredTone", option.value)}
              style={({ pressed }) => [
                styles.optionRow,
                {
                  backgroundColor:
                    settings.preferredTone === option.value
                      ? theme.primary + "15"
                      : "transparent",
                  borderWidth: 1,
                  borderColor:
                    settings.preferredTone === option.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.optionContent}>
                <ThemedText
                  type="body"
                  style={{
                    fontWeight: settings.preferredTone === option.value ? "600" : "400",
                  }}
                >
                  {option.label}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {option.description}
                </ThemedText>
              </View>
              {settings.preferredTone === option.value && (
                <Feather name="check-circle" size={20} color={theme.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Voice Settings
      </ThemedText>
      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ marginBottom: Spacing.xs }}>
          Narrator Voice
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          Tap to select, press play to preview
        </ThemedText>
        <View style={styles.voiceList}>
          {VOICE_OPTIONS.map((option) => (
            <View
              key={option.value}
              style={[
                styles.voiceRow,
                {
                  backgroundColor:
                    settings.preferredVoice === option.value
                      ? theme.primary + "15"
                      : "transparent",
                  borderWidth: 1,
                  borderColor:
                    settings.preferredVoice === option.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <Pressable
                onPress={() => updateSetting("preferredVoice", option.value)}
                style={styles.voiceContent}
              >
                <View style={styles.voiceTextContainer}>
                  <ThemedText
                    type="body"
                    style={{
                      fontWeight: settings.preferredVoice === option.value ? "600" : "400",
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </View>
                {settings.preferredVoice === option.value && (
                  <Feather name="check-circle" size={20} color={theme.primary} />
                )}
              </Pressable>
              <Pressable
                onPress={() => handlePreviewVoice(option.value)}
                disabled={previewingVoice !== null && previewingVoice !== option.value}
                style={({ pressed }) => [
                  styles.previewButton,
                  {
                    backgroundColor: theme.primary + (pressed ? "30" : "20"),
                    opacity: previewingVoice !== null && previewingVoice !== option.value ? 0.5 : 1,
                  },
                ]}
              >
                {previewingVoice === option.value ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Feather
                    name={previewingVoice === option.value ? "pause" : "volume-2"}
                    size={18}
                    color={theme.primary}
                  />
                )}
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Audio Settings
      </ThemedText>
      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body">Audio Quality</ThemedText>
        <View style={styles.qualityOptions}>
          {QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => updateSetting("audioQuality", option.value)}
              style={[
                styles.qualityOption,
                {
                  backgroundColor:
                    settings.audioQuality === option.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color:
                    settings.audioQuality === option.value ? "#FFFFFF" : theme.text,
                  fontWeight: settings.audioQuality === option.value ? "600" : "400",
                }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <ThemedText type="body">Auto-save Podcasts</ThemedText>
            <ThemedText type="caption">
              Automatically save generated podcasts
            </ThemedText>
          </View>
          <Switch
            value={settings.autoSave}
            onValueChange={(value) => updateSetting("autoSave", value)}
            trackColor={{ false: theme.backgroundSecondary, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        About
      </ThemedText>
      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.aboutRow}>
          <ThemedText type="body">Version</ThemedText>
          <ThemedText type="caption">
            {Constants.expoConfig?.version || "1.0.0"}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Data
      </ThemedText>
      <Spacer height={Spacing.md} />

      <Pressable
        onPress={handleClearData}
        style={({ pressed }) => [
          styles.dangerButton,
          {
            backgroundColor: theme.error + "15",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="trash-2" size={20} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error, marginLeft: Spacing.md }}>
          Clear All Data
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["4xl"]} />
    </ScreenKeyboardAwareScrollView>

    <ConfirmDialog
      visible={showSignOutDialog}
      title="Sign Out"
      message="Are you sure you want to sign out? You'll need to sign in again to access your podcasts."
      confirmText="Sign Out"
      cancelText="Cancel"
      destructive
      onConfirm={confirmSignOut}
      onCancel={() => setShowSignOutDialog(false)}
    />

    <ConfirmDialog
      visible={showClearDataDialog}
      title="⚠️ Clear All Data"
      message="WARNING: This will permanently delete ALL your podcasts, series, and settings. This action CANNOT be undone. Are you absolutely sure you want to continue?"
      confirmText="Yes, Clear Everything"
      cancelText="Cancel"
      destructive
      warning
      onConfirm={confirmClearData}
      onCancel={() => setShowClearDataDialog(false)}
    />
  </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  settingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  qualityOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  qualityOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  voiceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    flex: 1,
    minWidth: "30%",
    maxWidth: "48%",
  },
  voiceContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: Spacing.md,
  },
  voiceTextContainer: {
    flex: 1,
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  signInPrompt: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  appleSignInButton: {
    width: "100%",
    height: 44,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  signInButton: {
    width: "100%",
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsColumn: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  optionContent: {
    flex: 1,
    gap: Spacing.xs,
  },
});

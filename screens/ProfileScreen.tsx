import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import Spacer from "@/components/Spacer";
import {
  getSettings,
  saveSettings,
  UserSettings,
  defaultSettings,
  clearAllData,
} from "@/utils/storage";

const AVATARS = [
  { icon: "mic" as const, label: "Microphone" },
  { icon: "headphones" as const, label: "Headphones" },
  { icon: "activity" as const, label: "Soundwave" },
];

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

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    const data = await getSettings();
    setSettings(data);
  }, []);

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

  const handleAvatarSelect = async (index: number) => {
    await updateSetting("avatarIndex", index);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your podcasts and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setSettings(defaultSettings);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Done", "All data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.lg} />

      <View style={styles.avatarSection}>
        <View style={styles.avatarsRow}>
          {AVATARS.map((avatar, index) => (
            <Pressable
              key={avatar.icon}
              onPress={() => handleAvatarSelect(index)}
              style={({ pressed }) => [
                styles.avatarButton,
                {
                  backgroundColor:
                    settings.avatarIndex === index
                      ? theme.primary
                      : theme.backgroundDefault,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Feather
                name={avatar.icon}
                size={32}
                color={settings.avatarIndex === index ? "#FFFFFF" : theme.text}
              />
            </Pressable>
          ))}
        </View>
        <ThemedText type="caption" style={{ textAlign: "center", marginTop: Spacing.sm }}>
          Choose your avatar
        </ThemedText>
      </View>

      <Spacer height={Spacing["3xl"]} />

      <View style={styles.inputSection}>
        <ThemedText type="small" style={styles.label}>
          Display Name
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
            },
          ]}
          value={settings.displayName}
          onChangeText={(value) => updateSetting("displayName", value)}
          placeholder="Enter your name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Voice Settings
      </ThemedText>
      <Spacer height={Spacing.md} />

      <View style={[styles.settingCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ marginBottom: Spacing.md }}>
          Narrator Voice
        </ThemedText>
        <View style={styles.voiceOptions}>
          {VOICE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => updateSetting("preferredVoice", option.value)}
              style={[
                styles.voiceOption,
                {
                  backgroundColor:
                    settings.preferredVoice === option.value
                      ? theme.primary
                      : theme.backgroundSecondary,
                  borderWidth: settings.preferredVoice === option.value ? 0 : 1,
                  borderColor: theme.primary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color:
                    settings.preferredVoice === option.value ? "#FFFFFF" : theme.text,
                  fontWeight: settings.preferredVoice === option.value ? "600" : "400",
                }}
                numberOfLines={1}
              >
                {option.label}
              </ThemedText>
            </Pressable>
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
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
  },
  avatarsRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  avatarButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  inputSection: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    opacity: 0.8,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
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
  voiceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  voiceOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: "30%",
    alignItems: "center",
  },
});

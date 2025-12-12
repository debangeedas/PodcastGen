import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { saveSettings, getSettings, UserSettings } from "@/utils/storage";
import { playVoicePreview, stopVoicePreview } from "@/utils/voicePreview";

const DEPTH_OPTIONS = [
  { value: "quick" as const, label: "Quick", description: "2-3 min - Brief overview" },
  { value: "standard" as const, label: "Standard", description: "5-7 min - Balanced coverage" },
  { value: "deep" as const, label: "Deep Dive", description: "10-12 min - Comprehensive" },
];

const TONE_OPTIONS = [
  { value: "conversational" as const, label: "Conversational", icon: "message-circle", description: "Casual and friendly" },
  { value: "educational" as const, label: "Educational", icon: "book", description: "Structured and informative" },
  { value: "storytelling" as const, label: "Storytelling", icon: "book-open", description: "Narrative-driven" },
];

const VOICE_OPTIONS = [
  { value: "onyx" as const, label: "Onyx", description: "Deep and authoritative" },
  { value: "alloy" as const, label: "Alloy", description: "Friendly and approachable" },
  { value: "echo" as const, label: "Echo", description: "Warm and engaging" },
  { value: "fable" as const, label: "Fable", description: "Expressive storyteller" },
  { value: "nova" as const, label: "Nova", description: "Energetic and enthusiastic" },
  { value: "shimmer" as const, label: "Shimmer", description: "Clear and articulate" },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState(0);
  const [selectedDepth, setSelectedDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [selectedTone, setSelectedTone] = useState<"conversational" | "educational" | "storytelling">("conversational");
  const [selectedVoice, setSelectedVoice] = useState<string>("onyx");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handlePreviewVoice = async (voiceName: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (previewingVoice === voiceName) {
        await stopVoicePreview();
        setPreviewingVoice(null);
        return;
      }

      setPreviewingVoice(voiceName);
      await playVoicePreview(voiceName);

      setTimeout(() => {
        setPreviewingVoice(null);
      }, 10000);
    } catch (error) {
      console.error("Voice preview error:", error);
      setPreviewingVoice(null);
    }
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save preferences and complete onboarding
      const currentSettings = await getSettings();
      const newSettings: UserSettings = {
        ...currentSettings,
        preferredDepth: selectedDepth,
        preferredTone: selectedTone,
        preferredVoice: selectedVoice as any,
      };
      await saveSettings(newSettings);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Save default settings when skipping
    const currentSettings = await getSettings();
    await saveSettings(currentSettings);
    onComplete();
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="headphones" size={56} color={theme.primary} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          Welcome to PodcastGen
        </ThemedText>

        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Your personal AI podcast studio
        </ThemedText>
      </View>

      <View style={styles.featuresGrid}>
        <View style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="zap" size={28} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.featureTitle}>
            Instant Creation
          </ThemedText>
          <ThemedText type="caption" style={[styles.featureDescription, { color: theme.textSecondary }]}>
            Generate high-quality podcasts in seconds with AI
          </ThemedText>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="mic" size={28} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.featureTitle}>
            Custom Voices
          </ThemedText>
          <ThemedText type="caption" style={[styles.featureDescription, { color: theme.textSecondary }]}>
            Choose from multiple professional narrator voices
          </ThemedText>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="sliders" size={28} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.featureTitle}>
            Full Control
          </ThemedText>
          <ThemedText type="caption" style={[styles.featureDescription, { color: theme.textSecondary }]}>
            Customize length, tone, and style to fit your needs
          </ThemedText>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="smartphone" size={28} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.featureTitle}>
            On the Go
          </ThemedText>
          <ThemedText type="caption" style={[styles.featureDescription, { color: theme.textSecondary }]}>
            Create and listen anywhere, anytime
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderDepthSelection = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="h3" style={styles.stepTitle}>
        Episode Length
      </ThemedText>

      <ThemedText type="body" style={[styles.stepDescription, { color: theme.textSecondary }]}>
        How long do you prefer your podcasts to be?
      </ThemedText>

      <View style={styles.optionsContainer}>
        {DEPTH_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedDepth(option.value);
            }}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: selectedDepth === option.value
                  ? theme.primary + "15"
                  : theme.backgroundDefault,
                borderWidth: 2,
                borderColor: selectedDepth === option.value
                  ? theme.primary
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText type="h4" style={{ marginBottom: Spacing.xs }}>
              {option.label}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {option.description}
            </ThemedText>
            {selectedDepth === option.value && (
              <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderToneSelection = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="h3" style={styles.stepTitle}>
        Tone & Style
      </ThemedText>

      <ThemedText type="body" style={[styles.stepDescription, { color: theme.textSecondary }]}>
        What style do you prefer for your podcasts?
      </ThemedText>

      <View style={styles.optionsContainer}>
        {TONE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTone(option.value);
            }}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: selectedTone === option.value
                  ? theme.primary + "15"
                  : theme.backgroundDefault,
                borderWidth: 2,
                borderColor: selectedTone === option.value
                  ? theme.primary
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name={option.icon as any}
              size={32}
              color={selectedTone === option.value ? theme.primary : theme.textSecondary}
              style={{ marginBottom: Spacing.sm }}
            />
            <ThemedText type="h4" style={{ marginBottom: Spacing.xs }}>
              {option.label}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {option.description}
            </ThemedText>
            {selectedTone === option.value && (
              <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderVoiceSelection = () => (
    <View style={styles.stepContainer}>
      <ThemedText type="h3" style={styles.stepTitle}>
        Narrator Voice
      </ThemedText>

      <ThemedText type="body" style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Choose your preferred narrator voice. Tap to preview!
      </ThemedText>

      <View style={styles.voiceGrid}>
        {VOICE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedVoice(option.value);
            }}
            style={({ pressed }) => [
              styles.voiceCard,
              {
                backgroundColor: selectedVoice === option.value
                  ? theme.primary + "15"
                  : theme.backgroundDefault,
                borderWidth: 2,
                borderColor: selectedVoice === option.value
                  ? theme.primary
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.voiceCardContent}>
              <ThemedText type="body" style={{ fontWeight: "600", marginBottom: 2 }}>
                {option.label}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
                {option.description}
              </ThemedText>
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handlePreviewVoice(option.value);
              }}
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
                <Feather name="volume-2" size={14} color={theme.primary} />
              )}
            </Pressable>

            {selectedVoice === option.value && (
              <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderWelcome();
      case 1:
        return renderDepthSelection();
      case 2:
        return renderToneSelection();
      case 3:
        return renderVoiceSelection();
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i <= step ? theme.primary : theme.backgroundSecondary,
                },
              ]}
            />
          ))}
        </View>

        {step > 0 && (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Skip
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        {renderStep()}
      </View>

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="arrow-left" size={20} color={theme.text} />
          </Pressable>
        )}

        <View style={{ flex: 1, marginLeft: step > 0 ? Spacing.md : 0 }}>
          <Button onPress={handleNext}>
            {step === 3 ? "Get Started" : step === 0 ? "Let's Begin" : "Continue"}
          </Button>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    minHeight: 140,
    justifyContent: "center",
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  featureTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  featureDescription: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  voiceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    flex: 1,
    minWidth: "30%",
    maxWidth: "48%",
  },
  voiceCardContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
});

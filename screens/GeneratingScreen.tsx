import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Alert, Animated, Easing } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import {
  generatePodcast,
  generatePodcastSeries,
  GenerationProgress,
} from "@/utils/podcastGenerator";
import { savePodcast, saveSeries, addRecentSearch, getSettings } from "@/utils/storage";

type GeneratingScreenProps = {
  navigation: NativeStackNavigationProp<CreateStackParamList, "Generating">;
  route: RouteProp<CreateStackParamList, "Generating">;
};

const SINGLE_STAGES = [
  { key: "searching", label: "Searching credible sources" },
  { key: "analyzing", label: "Analyzing information" },
  { key: "generating", label: "Generating script" },
  { key: "creating_audio", label: "Creating audio" },
];

const SERIES_STAGES = [
  { key: "planning", label: "Planning episode structure" },
  { key: "searching", label: "Researching episodes" },
  { key: "generating", label: "Writing scripts" },
  { key: "creating_audio", label: "Creating audio" },
];

export default function GeneratingScreen({
  navigation,
  route,
}: GeneratingScreenProps) {
  const { theme } = useTheme();
  const { topic, isSeries } = route.params;
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: isSeries ? "planning" : "searching",
    message: "Starting...",
    progress: 0,
  });
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  const stages = isSeries ? SERIES_STAGES : SINGLE_STAGES;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();

    return () => spin.stop();
  }, [spinValue]);

  useEffect(() => {
    const generate = async () => {
      try {
        const settings = await getSettings();

        if (isSeries) {
          const result = await generatePodcastSeries(topic, (prog) => {
            if (isMounted.current) {
              setProgress(prog);
            }
          }, settings.preferredVoice);

          await saveSeries(result.series);
          for (const episode of result.episodes) {
            await savePodcast(episode);
          }
          await addRecentSearch(topic);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (isMounted.current) {
            setIsGenerating(false);
            navigation.replace("SeriesDetail", { seriesId: result.series.id });
          }
        } else {
          const podcast = await generatePodcast(topic, (prog) => {
            if (isMounted.current) {
              setProgress(prog);
            }
          }, settings.preferredVoice);

          await savePodcast(podcast);
          await addRecentSearch(topic);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (isMounted.current) {
            setIsGenerating(false);
            navigation.replace("Player", { podcastId: podcast.id });
          }
        }
      } catch (err) {
        console.error("Generation error:", err);
        if (isMounted.current) {
          setIsGenerating(false);
          setError(err instanceof Error ? err.message : "Failed to generate podcast");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    };

    generate();
  }, [topic, isSeries, navigation, retryCount]);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Generation",
      "Are you sure you want to cancel? Progress will be lost.",
      [
        { text: "Continue", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleRetry = () => {
    setError(null);
    setIsGenerating(true);
    setProgress({ stage: isSeries ? "planning" : "searching", message: "Starting...", progress: 0 });
    setRetryCount((c) => c + 1);
  };

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getCurrentStageIndex = () => {
    return stages.findIndex((s) => s.key === progress.stage);
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.errorIcon, { backgroundColor: theme.error + "20" }]}>
            <Feather name="alert-circle" size={32} color={theme.error} />
          </View>
          <ThemedText type="h3" style={styles.title}>
            Generation Failed
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            {error}
          </ThemedText>
          <View style={styles.buttonContainer}>
            <Button onPress={handleRetry}>Try Again</Button>
            <Button
              onPress={() => navigation.goBack()}
              style={{ backgroundColor: theme.backgroundSecondary, marginTop: Spacing.md }}
            >
              Go Back
            </Button>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
          <Feather name="loader" size={48} color={theme.primary} />
        </Animated.View>

        <ThemedText type="h3" style={styles.title}>
          {isSeries ? "Creating Your Series" : "Creating Your Podcast"}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.topic, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {topic}
        </ThemedText>

        {isSeries && progress.episodeNumber ? (
          <View style={[styles.episodeBadge, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText style={[styles.episodeBadgeText, { color: theme.primary }]}>
              Episode {progress.episodeNumber} of {progress.totalEpisodes}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.stagesContainer}>
          {stages.map((stage, index) => {
            const currentIndex = getCurrentStageIndex();
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <View key={stage.key} style={styles.stageRow}>
                <View
                  style={[
                    styles.stageIndicator,
                    {
                      backgroundColor: isComplete
                        ? theme.success
                        : isCurrent
                          ? theme.primary
                          : theme.backgroundSecondary,
                    },
                  ]}
                >
                  {isComplete ? (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  ) : (
                    <View
                      style={[
                        styles.stageDot,
                        {
                          backgroundColor: isCurrent
                            ? "#FFFFFF"
                            : theme.textSecondary,
                        },
                      ]}
                    />
                  )}
                </View>
                <ThemedText
                  type="small"
                  style={{
                    color: isPending ? theme.textSecondary : theme.text,
                    fontWeight: isCurrent ? "600" : "400",
                  }}
                >
                  {stage.label}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${progress.progress * 100}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {Math.round(progress.progress * 100)}%
          </ThemedText>
        </View>

        <Button
          onPress={handleCancel}
          style={{ backgroundColor: theme.backgroundSecondary, marginTop: Spacing.xl }}
        >
          Cancel
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  title: {
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  topic: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  message: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  episodeBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  episodeBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stagesContainer: {
    width: "100%",
    marginTop: Spacing["2xl"],
    gap: Spacing.md,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stageIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressContainer: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    width: "100%",
    marginTop: Spacing.xl,
  },
});

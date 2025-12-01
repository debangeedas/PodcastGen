import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import Spacer from "@/components/Spacer";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import {
  getRecentSearches,
  deleteRecentSearch,
} from "@/utils/storage";

type CreateScreenProps = {
  navigation: NativeStackNavigationProp<CreateStackParamList, "Create">;
};

type PodcastType = "single" | "series";

const QUICK_TOPICS_SINGLE = [
  "What is quantum computing?",
  "How does photosynthesis work?",
  "Explain blockchain technology",
];

const QUICK_TOPICS_SERIES = [
  "The European Renaissance",
  "History of Ancient Rome",
  "Artificial Intelligence",
  "Climate Science",
  "World War II",
];

export default function CreateScreen({ navigation }: CreateScreenProps) {
  const { theme, isDark } = useTheme();
  const [topic, setTopic] = useState("");
  const [podcastType, setPodcastType] = useState<PodcastType>("single");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const loadRecentSearches = useCallback(async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  }, []);

  useEffect(() => {
    loadRecentSearches();
    const unsubscribe = navigation.addListener("focus", loadRecentSearches);
    return unsubscribe;
  }, [navigation, loadRecentSearches]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Enter a topic", "Please enter what you want to learn about.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Generating", { 
      topic: topic.trim(),
      isSeries: podcastType === "series",
    });
  };

  const handleQuickTopic = async (quickTopic: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTopic(quickTopic);
  };

  const handleRecentSearch = async (search: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTopic(search);
  };

  const handleDeleteRecentSearch = async (search: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteRecentSearch(search);
    loadRecentSearches();
  };

  const handleToggleType = async (type: PodcastType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPodcastType(type);
  };

  const quickTopics = podcastType === "single" ? QUICK_TOPICS_SINGLE : QUICK_TOPICS_SERIES;

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.lg} />

      <ThemedText type="h1" style={styles.heading}>
        Create a Podcast
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {podcastType === "single"
          ? "Enter a specific topic for a single focused episode."
          : "Enter a broad topic to generate a multi-episode series."}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <View style={[styles.typeToggle, { backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          onPress={() => handleToggleType("single")}
          style={[
            styles.typeOption,
            podcastType === "single" && { backgroundColor: theme.primary },
          ]}
        >
          <Feather
            name="mic"
            size={18}
            color={podcastType === "single" ? "#FFFFFF" : theme.textSecondary}
            style={styles.typeIcon}
          />
          <ThemedText
            style={[
              styles.typeText,
              { color: podcastType === "single" ? "#FFFFFF" : theme.textSecondary },
            ]}
          >
            Single Episode
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleToggleType("series")}
          style={[
            styles.typeOption,
            podcastType === "series" && { backgroundColor: theme.primary },
          ]}
        >
          <Feather
            name="layers"
            size={18}
            color={podcastType === "series" ? "#FFFFFF" : theme.textSecondary}
            style={styles.typeIcon}
          />
          <ThemedText
            style={[
              styles.typeText,
              { color: podcastType === "series" ? "#FFFFFF" : theme.textSecondary },
            ]}
          >
            Series
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing.xl} />

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
            },
          ]}
          value={topic}
          onChangeText={setTopic}
          placeholder={
            podcastType === "single"
              ? "e.g., How do black holes form?"
              : "e.g., The European Renaissance"
          }
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="default"
        />
      </View>

      {podcastType === "series" ? (
        <View style={[styles.seriesInfo, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="info" size={16} color={theme.primary} />
          <ThemedText style={[styles.seriesInfoText, { color: theme.textSecondary }]}>
            A series will generate 3-5 episodes covering different aspects of your topic.
          </ThemedText>
        </View>
      ) : null}

      <Spacer height={Spacing.lg} />

      <Button onPress={handleGenerate} disabled={!topic.trim()}>
        {podcastType === "single" ? "Generate Episode" : "Generate Series"}
      </Button>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        {podcastType === "single" ? "Quick Topics" : "Series Ideas"}
      </ThemedText>
      <Spacer height={Spacing.md} />
      <View style={styles.chipsContainer}>
        {quickTopics.map((quickTopic) => (
          <Pressable
            key={quickTopic}
            onPress={() => handleQuickTopic(quickTopic)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText type="small">{quickTopic}</ThemedText>
          </Pressable>
        ))}
      </View>

      {recentSearches.length > 0 ? (
        <>
          <Spacer height={Spacing["3xl"]} />
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recent Searches
          </ThemedText>
          <Spacer height={Spacing.md} />
          {recentSearches.map((search) => (
            <Pressable
              key={search}
              onPress={() => handleRecentSearch(search)}
              style={({ pressed }) => [
                styles.recentItem,
                {
                  backgroundColor: theme.backgroundDefault,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.recentContent}>
                <Feather
                  name="clock"
                  size={16}
                  color={theme.textSecondary}
                  style={styles.recentIcon}
                />
                <ThemedText type="body" numberOfLines={1} style={styles.recentText}>
                  {search}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleDeleteRecentSearch(search)}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </Pressable>
          ))}
        </>
      ) : null}

      <Spacer height={Spacing["4xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  typeToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  typeIcon: {
    marginRight: Spacing.xs,
  },
  typeText: {
    fontWeight: "600",
    fontSize: 15,
  },
  inputContainer: {
    width: "100%",
  },
  input: {
    minHeight: 100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: Typography.body.fontSize,
    textAlignVertical: "top",
  },
  seriesInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  seriesInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  recentContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recentIcon: {
    marginRight: Spacing.sm,
  },
  recentText: {
    flex: 1,
  },
});

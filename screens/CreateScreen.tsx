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
import LoginPrompt from "@/components/LoginPrompt";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
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

const QUICK_TOPICS = [
  "What is quantum computing?",
  "The French Revolution",
  "How does photosynthesis work?",
  "History of Ancient Rome",
  "Explain blockchain technology",
  "The Renaissance Era",
];

export default function CreateScreen({ navigation }: CreateScreenProps) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const loadRecentSearches = useCallback(async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  }, []);

  useEffect(() => {
    loadRecentSearches();
    const unsubscribe = navigation.addListener("focus", loadRecentSearches);
    return unsubscribe;
  }, [navigation, loadRecentSearches]);

  const proceedToCreate = () => {
    navigation.navigate("ChatCreation", { 
      topic: topic.trim(),
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Enter a topic", "Please enter what you want to learn about.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    proceedToCreate();
  };

  const handleLoginSuccess = () => {
    setShowLoginPrompt(false);
    proceedToCreate();
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

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.lg} />

      <ThemedText type="h1" style={styles.heading}>
        Create a Podcast
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        Enter any topic and I'll help you create the perfect podcast.
      </ThemedText>

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
          placeholder="e.g., The history of jazz music"
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="default"
        />
      </View>

      <Spacer height={Spacing.lg} />

      <Button onPress={handleGenerate} disabled={!topic.trim()}>
        Start Creating
      </Button>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Topic Ideas
      </ThemedText>
      <Spacer height={Spacing.md} />
      <View style={styles.chipsContainer}>
        {QUICK_TOPICS.map((quickTopic) => (
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

      <LoginPrompt
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onSuccess={handleLoginSuccess}
      />
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

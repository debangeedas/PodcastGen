import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { Podcast, getPodcasts, deletePodcast, toggleFavorite } from "@/utils/storage";
import { formatDuration } from "@/utils/podcastGenerator";
import { WaveformPreview } from "@/components/WaveformPreview";

type LibraryScreenProps = {
  navigation: NativeStackNavigationProp<LibraryStackParamList, "Library">;
};

function EmptyState({ theme }: { theme: any }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="mic" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Podcasts Yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyMessage, { color: theme.textSecondary }]}
      >
        Create your first podcast by tapping the Create tab below.
      </ThemedText>
    </View>
  );
}

export default function LibraryScreen({ navigation }: LibraryScreenProps) {
  const { theme, isDark } = useTheme();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPodcasts = useCallback(async () => {
    const data = await getPodcasts();
    setPodcasts(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPodcasts();
    }, [loadPodcasts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPodcasts();
    setRefreshing(false);
  };

  const handlePlay = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Player", { podcastId: podcast.id });
  };

  const handleDelete = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Podcast",
      `Are you sure you want to delete "${podcast.topic}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePodcast(podcast.id);
            loadPodcasts();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleFavorite(podcast.id);
    loadPodcasts();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderItem = ({ item }: { item: Podcast }) => (
    <Pressable
      onPress={() => handlePlay(item)}
      onLongPress={() => handleDelete(item)}
      style={({ pressed }) => [
        styles.podcastCard,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: item.isFavorite ? 2 : 0,
          borderColor: item.isFavorite ? theme.primary : "transparent",
        },
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h4" numberOfLines={2} style={styles.podcastTitle}>
              {item.topic}
            </ThemedText>
            {item.category && (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                {item.category}
              </ThemedText>
            )}
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => handleToggleFavorite(item)}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather
                name={item.isFavorite ? "heart" : "heart"}
                size={18}
                color={item.isFavorite ? theme.primary : theme.textSecondary}
                fill={item.isFavorite ? theme.primary : "none"}
              />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item)}
              hitSlop={12}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Feather name="trash-2" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.waveformContainer}>
          <WaveformPreview color={theme.primary} />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaInfo}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs }}>
              {formatDuration(item.duration)}
            </ThemedText>
          </View>
          <ThemedText type="caption">{formatDate(item.createdAt)}</ThemedText>
        </View>

        <View style={styles.playOverlay}>
          <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
            <Feather name="play" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (podcasts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState theme={theme} />
      </ThemedView>
    );
  }

  return (
    <ScreenFlatList
      data={podcasts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    textAlign: "center",
    maxWidth: 280,
  },
  podcastCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  cardContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  podcastTitle: {
    marginBottom: Spacing.xs,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  waveformContainer: {
    height: 40,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg + 30,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },
});

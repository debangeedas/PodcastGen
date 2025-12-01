import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Podcast {
  id: string;
  topic: string;
  script: string;
  audioUri: string | null;
  duration: number;
  createdAt: string;
  sources: string[];
  category?: string;
  isFavorite?: boolean;
  voiceUsed?: string;
}

export interface UserSettings {
  displayName: string;
  avatarIndex: number;
  audioQuality: "standard" | "high" | "premium";
  autoSave: boolean;
  preferredVoice: "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer";
  voiceSpeed: number;
}

const PODCASTS_KEY = "@podcasts";
const SETTINGS_KEY = "@settings";
const RECENT_SEARCHES_KEY = "@recent_searches";

export const defaultSettings: UserSettings = {
  displayName: "Listener",
  avatarIndex: 0,
  audioQuality: "high",
  autoSave: true,
  preferredVoice: "onyx",
  voiceSpeed: 1,
};

export async function getPodcasts(): Promise<Podcast[]> {
  try {
    const data = await AsyncStorage.getItem(PODCASTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting podcasts:", error);
    return [];
  }
}

export async function savePodcast(podcast: Podcast): Promise<void> {
  try {
    const podcasts = await getPodcasts();
    const existingIndex = podcasts.findIndex((p) => p.id === podcast.id);
    if (existingIndex >= 0) {
      podcasts[existingIndex] = podcast;
    } else {
      podcasts.unshift(podcast);
    }
    await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
  } catch (error) {
    console.error("Error saving podcast:", error);
    throw error;
  }
}

export async function deletePodcast(podcastId: string): Promise<void> {
  try {
    const podcasts = await getPodcasts();
    const filtered = podcasts.filter((p) => p.id !== podcastId);
    await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting podcast:", error);
    throw error;
  }
}

export async function getPodcastById(
  podcastId: string
): Promise<Podcast | null> {
  try {
    const podcasts = await getPodcasts();
    return podcasts.find((p) => p.id === podcastId) || null;
  } catch (error) {
    console.error("Error getting podcast:", error);
    return null;
  }
}

export async function toggleFavorite(podcastId: string): Promise<void> {
  try {
    const podcasts = await getPodcasts();
    const podcast = podcasts.find((p) => p.id === podcastId);
    if (podcast) {
      podcast.isFavorite = !podcast.isFavorite;
      await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
}

export async function updatePodcastCategory(
  podcastId: string,
  category: string
): Promise<void> {
  try {
    const podcasts = await getPodcasts();
    const podcast = podcasts.find((p) => p.id === podcastId);
    if (podcast) {
      podcast.category = category;
      await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
    }
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}

export async function getSettings(): Promise<UserSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch (error) {
    console.error("Error getting settings:", error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export async function getRecentSearches(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting recent searches:", error);
    return [];
  }
}

export async function addRecentSearch(search: string): Promise<void> {
  try {
    const searches = await getRecentSearches();
    const filtered = searches.filter((s) => s !== search);
    filtered.unshift(search);
    const limited = filtered.slice(0, 10);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Error adding recent search:", error);
  }
}

export async function deleteRecentSearch(search: string): Promise<void> {
  try {
    const searches = await getRecentSearches();
    const filtered = searches.filter((s) => s !== search);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting recent search:", error);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      PODCASTS_KEY,
      SETTINGS_KEY,
      RECENT_SEARCHES_KEY,
    ]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

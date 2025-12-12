import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  syncSettingsToFirestore,
  syncPodcastToFirestore,
  deletePodcastFromFirestore,
  syncSeriesToFirestore,
  deleteSeriesFromFirestore,
  syncSearchesToFirestore,
  initialSyncFromFirestore,
} from './firestoreSync';

export interface Source {
  title: string;
  url: string;
}

export interface Podcast {
  id: string;
  topic: string;
  script: string;
  audioUri: string | null;
  duration: number;
  createdAt: string;
  sources: (string | Source)[]; // Support both old string format and new Source format
  category?: string;
  isFavorite?: boolean;
  voiceUsed?: string;
  seriesId?: string;
  episodeNumber?: number;
  episodeTitle?: string;
  style?: "conversational" | "educational" | "storytelling" | "documentary" | "quick";
  depth?: "quick" | "standard" | "deep";
}

export interface PodcastSeries {
  id: string;
  topic: string;
  description: string;
  episodeCount: number;
  totalDuration: number;
  createdAt: string;
  coverColor: string;
  isFavorite?: boolean;
  style?: "conversational" | "educational" | "storytelling" | "documentary" | "quick";
  depth?: "quick" | "standard" | "deep";
}

export interface UserSettings {
  displayName: string;
  avatarIndex: number;
  audioQuality: "standard" | "high" | "premium";
  autoSave: boolean;
  preferredVoice: "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer";
  voiceSpeed: number;
  // Content preferences
  preferredDepth: "quick" | "standard" | "deep";
  preferredTone: "conversational" | "educational" | "storytelling";
}

const PODCASTS_KEY = "@podcasts";
const SERIES_KEY = "@series";
const SETTINGS_KEY = "@settings";
const RECENT_SEARCHES_KEY = "@recent_searches";

// Track current user for Firestore sync
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
  console.log('📌 Current user ID set:', userId ? userId.substring(0, 8) + '...' : 'none');
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export const defaultSettings: UserSettings = {
  displayName: "Listener",
  avatarIndex: 0,
  audioQuality: "high",
  autoSave: true,
  preferredVoice: "onyx",
  voiceSpeed: 1,
  preferredDepth: "standard",
  preferredTone: "conversational",
};

/**
 * Validates if an audio file exists and is accessible
 */
async function validateAudioFile(audioUri: string | null | undefined): Promise<boolean> {
  if (!audioUri) {
    return false;
  }

  try {
    // Check if it's a remote URL (http/https)
    if (audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
      // For remote URLs, try a HEAD request to check if file exists
      try {
        const response = await fetch(audioUri, { method: 'HEAD' });
        return response.ok;
      } catch {
        // If HEAD fails, assume it might still be valid (could be CORS issue)
        // Remote URLs are generally trusted to exist
        return true;
      }
    }

    // Check if it's a blob URL (web only, temporary)
    if (audioUri.startsWith('blob:')) {
      // Blob URLs are temporary and may not exist after page reload
      // We'll check if we can create an object from it
      try {
        const response = await fetch(audioUri);
        return response.ok;
      } catch {
        return false;
      }
    }

    // Check if it's a local file path
    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      return fileInfo.exists;
    }

    // For web with file:// protocol or other local paths
    return true;
  } catch (error) {
    console.error("Error validating audio file:", error);
    return false;
  }
}

/**
 * Filters out podcasts with missing or invalid audio files
 */
async function filterValidPodcasts(podcasts: Podcast[]): Promise<Podcast[]> {
  if (podcasts.length === 0) {
    return [];
  }

  // Validate all podcasts in parallel for better performance
  const validationPromises = podcasts.map(async (podcast) => {
    const isValid = await validateAudioFile(podcast.audioUri);
    return { podcast, isValid };
  });

  const results = await Promise.all(validationPromises);
  
  const validPodcasts: Podcast[] = [];
  const invalidPodcastIds: string[] = [];

  for (const { podcast, isValid } of results) {
    if (isValid) {
      validPodcasts.push(podcast);
    } else {
      console.warn(`⚠️ Removing podcast "${podcast.topic}" (ID: ${podcast.id}) - audio file missing or invalid`);
      invalidPodcastIds.push(podcast.id);
    }
  }

  // Remove invalid podcasts from storage if any were found
  if (invalidPodcastIds.length > 0) {
    try {
      const allPodcastsData = await AsyncStorage.getItem(PODCASTS_KEY);
      if (allPodcastsData) {
        const parsed = JSON.parse(allPodcastsData) as Podcast[];
        const filtered = parsed.filter((p) => !invalidPodcastIds.includes(p.id));
        await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(filtered));
        console.log(`🧹 Cleaned up ${invalidPodcastIds.length} podcast(s) with missing audio files`);
      }
    } catch (error) {
      console.error("Error cleaning up invalid podcasts:", error);
    }
  }

  return validPodcasts;
}

export async function getPodcasts(): Promise<Podcast[]> {
  try {
    const data = await AsyncStorage.getItem(PODCASTS_KEY);
    const podcasts = data ? JSON.parse(data) : [];
    
    // Filter out podcasts with missing audio files
    return await filterValidPodcasts(podcasts);
  } catch (error) {
    console.error("Error getting podcasts:", error);
    return [];
  }
}

export async function getStandalonePodcasts(): Promise<Podcast[]> {
  try {
    const podcasts = await getPodcasts();
    return podcasts.filter((p) => !p.seriesId);
  } catch (error) {
    console.error("Error getting standalone podcasts:", error);
    return [];
  }
}

export async function getSeriesEpisodes(seriesId: string): Promise<Podcast[]> {
  try {
    const podcasts = await getPodcasts();
    return podcasts
      .filter((p) => p.seriesId === seriesId)
      .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
  } catch (error) {
    console.error("Error getting series episodes:", error);
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

    // Sync to Firestore if user is logged in
    if (currentUserId) {
      await syncPodcastToFirestore(currentUserId, podcast);
    }
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

    // Delete from Firestore if user is logged in
    if (currentUserId) {
      await deletePodcastFromFirestore(currentUserId, podcastId);
    }
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

export async function getSeries(): Promise<PodcastSeries[]> {
  try {
    const data = await AsyncStorage.getItem(SERIES_KEY);
    const allSeries = data ? JSON.parse(data) : [];
    
    // Filter out series that have no valid episodes
    const validSeries: PodcastSeries[] = [];
    const invalidSeriesIds: string[] = [];

    for (const series of allSeries) {
      const episodes = await getSeriesEpisodes(series.id);
      if (episodes.length > 0) {
        validSeries.push(series);
      } else {
        console.warn(`⚠️ Removing series "${series.topic}" (ID: ${series.id}) - no valid episodes`);
        invalidSeriesIds.push(series.id);
      }
    }

    // Remove invalid series from storage if any were found
    if (invalidSeriesIds.length > 0) {
      try {
        const filtered = allSeries.filter((s: PodcastSeries) => !invalidSeriesIds.includes(s.id));
        await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(filtered));
        console.log(`🧹 Cleaned up ${invalidSeriesIds.length} series with no valid episodes`);
      } catch (error) {
        console.error("Error cleaning up invalid series:", error);
      }
    }

    return validSeries;
  } catch (error) {
    console.error("Error getting series:", error);
    return [];
  }
}

export async function getSeriesById(seriesId: string): Promise<PodcastSeries | null> {
  try {
    const series = await getSeries();
    return series.find((s) => s.id === seriesId) || null;
  } catch (error) {
    console.error("Error getting series:", error);
    return null;
  }
}

export async function saveSeries(series: PodcastSeries): Promise<void> {
  try {
    const allSeries = await getSeries();
    const existingIndex = allSeries.findIndex((s) => s.id === series.id);
    if (existingIndex >= 0) {
      allSeries[existingIndex] = series;
    } else {
      allSeries.unshift(series);
    }
    await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(allSeries));

    // Sync to Firestore if user is logged in
    if (currentUserId) {
      await syncSeriesToFirestore(currentUserId, series);
    }
  } catch (error) {
    console.error("Error saving series:", error);
    throw error;
  }
}

export async function deleteSeries(seriesId: string): Promise<void> {
  try {
    const allSeries = await getSeries();
    const filtered = allSeries.filter((s) => s.id !== seriesId);
    await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(filtered));

    const podcasts = await getPodcasts();
    const filteredPodcasts = podcasts.filter((p) => p.seriesId !== seriesId);
    await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(filteredPodcasts));

    // Delete from Firestore if user is logged in
    if (currentUserId) {
      await deleteSeriesFromFirestore(currentUserId, seriesId);
      // Also delete all episodes from this series
      const episodes = podcasts.filter((p) => p.seriesId === seriesId);
      for (const episode of episodes) {
        await deletePodcastFromFirestore(currentUserId, episode.id);
      }
    }
  } catch (error) {
    console.error("Error deleting series:", error);
    throw error;
  }
}

export async function toggleSeriesFavorite(seriesId: string): Promise<void> {
  try {
    const allSeries = await getSeries();
    const series = allSeries.find((s) => s.id === seriesId);
    if (series) {
      series.isFavorite = !series.isFavorite;
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(allSeries));
    }
  } catch (error) {
    console.error("Error toggling series favorite:", error);
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

    // Sync to Firestore if user is logged in
    if (currentUserId) {
      await syncSettingsToFirestore(currentUserId, settings);
    }
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

    // Sync to Firestore if user is logged in
    if (currentUserId) {
      await syncSearchesToFirestore(currentUserId, limited);
    }
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
      SERIES_KEY,
      SETTINGS_KEY,
      RECENT_SEARCHES_KEY,
    ]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

/**
 * Initial sync when user logs in - load all data from Firestore
 */
export async function loadUserDataFromFirestore(userId: string): Promise<void> {
  try {
    console.log('🔄 Loading user data from Firestore...');
    const data = await initialSyncFromFirestore(userId);

    // Save to AsyncStorage
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    await AsyncStorage.setItem(PODCASTS_KEY, JSON.stringify(data.podcasts));
    await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(data.series));
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(data.recentSearches));

    console.log('✅ User data loaded from Firestore:', {
      podcasts: data.podcasts.length,
      series: data.series.length,
      searches: data.recentSearches.length,
    });
  } catch (error) {
    console.error('❌ Error loading user data from Firestore:', error);
  }
}

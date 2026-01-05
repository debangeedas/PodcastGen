import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { Audio } from "expo-av";
import { Podcast, getPodcastById } from "@/utils/storage";

interface AudioPlayerState {
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  isLoading: boolean;
  playbackSpeed: number;
}

interface AudioPlayerContextType extends AudioPlayerState {
  playPodcast: (podcastId: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skip: (seconds: number) => Promise<void>;
  stopPlayback: () => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeekingRef = useRef(false);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      if (!isSeekingRef.current) {
        setPosition(Math.floor(status.positionMillis / 1000));
      }
      const audioDuration = Math.floor(status.durationMillis / 1000);
      if (!isNaN(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      }
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        soundRef.current?.setPositionAsync(0);
      }
    }
  }, []);

  const unloadCurrentAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error("Error unloading audio:", error);
      }
      soundRef.current = null;
    }
  }, []);

  const playPodcast = useCallback(async (podcastId: string) => {
    setIsLoading(true);

    try {
      if (currentPodcast?.id === podcastId && soundRef.current) {
        await soundRef.current.playAsync();
        setIsLoading(false);
        return;
      }

      await unloadCurrentAudio();

      const podcast = await getPodcastById(podcastId);

      if (!podcast) {
        throw new Error("Podcast not found");
      }

      if (!podcast.audioUri) {
        throw new Error("This podcast doesn't have an audio file. Please regenerate it.");
      }

      console.log("🎵 Loading audio from:", podcast.audioUri.substring(0, 50) + "...");

      setCurrentPodcast(podcast);
      setDuration(podcast.duration);
      setPosition(0);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: podcast.audioUri },
        { shouldPlay: true, rate: playbackSpeed, shouldCorrectPitch: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      console.log("✅ Audio loaded and playing");

    } catch (error) {
      console.error("❌ Error playing podcast:", error);
      setIsLoading(false);
      throw error; // Re-throw so LibraryScreen can catch it
    } finally {
      setIsLoading(false);
    }
  }, [currentPodcast?.id, unloadCurrentAudio, onPlaybackStatusUpdate]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    isSeekingRef.current = true;
    setPosition(seconds);
    await soundRef.current.setPositionAsync(seconds * 1000);
    isSeekingRef.current = false;
  }, []);

  const skip = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    const newPosition = Math.max(0, Math.min(position + seconds, duration));
    await seekTo(newPosition);
  }, [position, duration, seekTo]);

  const stopPlayback = useCallback(async () => {
    await unloadCurrentAudio();
    setCurrentPodcast(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [unloadCurrentAudio]);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setRateAsync(speed, true); // true = shouldCorrectPitch
      setPlaybackSpeedState(speed);
    } catch (error) {
      console.error("Error setting playback speed:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      unloadCurrentAudio();
    };
  }, [unloadCurrentAudio]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentPodcast,
        isPlaying,
        position,
        duration,
        isLoading,
        playbackSpeed,
        playPodcast,
        togglePlayPause,
        seekTo,
        skip,
        stopPlayback,
        setPlaybackSpeed,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}

import { Audio } from "expo-av";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

const PREVIEW_TEXTS: Record<string, string> = {
  onyx: "Welcome to your podcast. This is the Onyx voice - deep and authoritative, perfect for serious topics and documentaries.",
  alloy: "Hi there! I'm the Alloy voice - friendly and approachable, great for casual conversations and storytelling.",
  echo: "Hello! This is the Echo voice - warm and engaging, ideal for educational content and interviews.",
  fable: "Greetings! I'm the Fable voice - expressive and theatrical, perfect for storytelling and dramatic narratives.",
  nova: "Hey! This is the Nova voice - energetic and enthusiastic, great for exciting topics and upbeat content.",
  shimmer: "Hello! I'm the Shimmer voice - clear and articulate, excellent for precise explanations and tutorials.",
};

let currentSound: Audio.Sound | null = null;

/**
 * Generate and play a voice preview
 */
export async function playVoicePreview(voiceName: string): Promise<void> {
  // Stop any currently playing preview
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    } catch (error) {
      console.error("Error stopping previous preview:", error);
    }
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const previewText = PREVIEW_TEXTS[voiceName] || PREVIEW_TEXTS.onyx;

  try {
    // Generate audio with OpenAI TTS
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1", // Use faster model for previews
        input: previewText,
        voice: voiceName,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API request failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioBlobUrl = URL.createObjectURL(audioBlob);

    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Create and play the sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioBlobUrl },
      { shouldPlay: true }
    );

    currentSound = sound;

    // Clean up when playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (currentSound === sound) {
          currentSound = null;
        }
        URL.revokeObjectURL(audioBlobUrl);
      }
    });
  } catch (error) {
    console.error("Error playing voice preview:", error);
    throw error;
  }
}

/**
 * Stop the currently playing preview
 */
export async function stopVoicePreview(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    } catch (error) {
      console.error("Error stopping preview:", error);
    }
  }
}

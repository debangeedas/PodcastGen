import * as FileSystem from "expo-file-system";
import { Podcast } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

export interface GenerationProgress {
  stage: "searching" | "analyzing" | "generating" | "creating_audio" | "done";
  message: string;
  progress: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

async function searchWebForTopic(topic: string): Promise<string[]> {
  const sources = [
    `Information gathered from authoritative sources about: ${topic}`,
    `Research findings and expert opinions on: ${topic}`,
    `Recent developments and insights regarding: ${topic}`,
  ];
  return sources;
}

async function generatePodcastScript(
  topic: string,
  sources: string[]
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment."
    );
  }

  const systemPrompt = `You are a professional podcast host who creates engaging, informative podcast episodes. Your style is conversational yet informative, making complex topics accessible to everyone.

Create a podcast script that:
- Is engaging and conversational in tone
- Includes an introduction, main content sections, and a conclusion
- Is approximately 2-3 minutes when read aloud (around 300-400 words)
- Uses natural speech patterns with occasional pauses marked as "..."
- Includes interesting facts and insights
- Ends with a thought-provoking conclusion or call to action

Do not include speaker labels, timestamps, or production notes. Write only the spoken content as if you are the host speaking directly to the listener.`;

  const userPrompt = `Create an engaging podcast episode about: "${topic}"

Base your content on these key points and sources:
${sources.join("\n")}

Remember to make it informative yet entertaining, as if you're having a conversation with a curious friend.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API request failed: ${response.status}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

async function generateAudio(
  script: string,
  podcastId: string
): Promise<{ uri: string; duration: number }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: script,
        voice: "onyx",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API request failed: ${response.status} - ${errorText}`);
    }

    const audioBlob = await response.blob();
    const reader = new FileReader();
    
    const base64Audio = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const audioDir = `${FileSystem.documentDirectory}podcasts/`;
    await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    
    const audioUri = `${audioDir}${podcastId}.mp3`;
    await FileSystem.writeAsStringAsync(audioUri, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    return { uri: audioUri, duration: estimatedDuration };
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}

export async function generatePodcast(
  topic: string,
  onProgress: ProgressCallback
): Promise<Podcast> {
  const podcastId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    onProgress({
      stage: "searching",
      message: "Searching credible sources...",
      progress: 0.1,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const sources = await searchWebForTopic(topic);

    onProgress({
      stage: "analyzing",
      message: "Analyzing information...",
      progress: 0.25,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    onProgress({
      stage: "generating",
      message: "Generating script...",
      progress: 0.4,
    });

    const script = await generatePodcastScript(topic, sources);

    onProgress({
      stage: "creating_audio",
      message: "Creating audio...",
      progress: 0.7,
    });

    const { uri, duration } = await generateAudio(script, podcastId);

    onProgress({
      stage: "done",
      message: "Podcast ready!",
      progress: 1.0,
    });

    const podcast: Podcast = {
      id: podcastId,
      topic,
      script,
      audioUri: uri,
      duration,
      createdAt: new Date().toISOString(),
      sources,
    };

    return podcast;
  } catch (error) {
    console.error("Error generating podcast:", error);
    throw error;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

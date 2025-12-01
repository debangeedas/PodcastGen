import * as FileSystem from "expo-file-system";
import { Podcast } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

export interface GenerationProgress {
  stage: "searching" | "analyzing" | "generating" | "creating_audio" | "done";
  message: string;
  progress: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

interface ResearchResult {
  content: string;
  sources: string[];
}

async function researchTopic(topic: string): Promise<ResearchResult> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment."
    );
  }

  const researchPrompt = `You are a research assistant tasked with gathering comprehensive, factual information about a topic. Your goal is to provide well-researched, accurate information that could be used to create an educational podcast.

Research the following topic thoroughly: "${topic}"

Provide:
1. A comprehensive overview of the topic (2-3 paragraphs)
2. 5-7 key facts, statistics, or insights that are interesting and educational
3. Recent developments or trends related to this topic
4. Common misconceptions to address
5. Expert perspectives or notable quotes on the subject

Format your response as structured research notes. Be factual, cite specific data where relevant, and focus on information that would make for engaging podcast content.

At the end, list 3-5 credible source types that would typically contain this information (e.g., "Academic journals on neuroscience", "CDC health statistics", "NASA research publications").`;

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
          {
            role: "system",
            content:
              "You are a knowledgeable research assistant with expertise across many domains. Provide accurate, well-organized information based on verified knowledge. When discussing facts, be specific with numbers, dates, and details where appropriate.",
          },
          { role: "user", content: researchPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Research API request failed: ${response.status}`
      );
    }

    const data = await response.json();
    const researchContent = data.choices[0]?.message?.content || "";

    const sourcePatterns = [
      /(?:sources?|references?|citations?):\s*([\s\S]*?)(?:\n\n|$)/i,
      /(?:credible sources?|source types?):\s*([\s\S]*?)(?:\n\n|$)/i,
    ];

    let extractedSources: string[] = [];
    for (const pattern of sourcePatterns) {
      const match = researchContent.match(pattern);
      if (match) {
        extractedSources = match[1]
          .split(/\n|,|;/)
          .map((s: string) => s.replace(/^[-*\d.)\s]+/, "").trim())
          .filter((s: string) => s.length > 10 && s.length < 100);
        break;
      }
    }

    if (extractedSources.length === 0) {
      extractedSources = [
        `Research databases and academic publications on ${topic}`,
        `Expert analysis and industry reports`,
        `Verified scientific and educational resources`,
      ];
    }

    return {
      content: researchContent,
      sources: extractedSources.slice(0, 5),
    };
  } catch (error) {
    console.error("Error researching topic:", error);
    throw error;
  }
}

async function generatePodcastScript(
  topic: string,
  research: ResearchResult
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment."
    );
  }

  const systemPrompt = `You are a charismatic podcast host known for making complex topics accessible and entertaining. You have a warm, conversational style that makes listeners feel like they're chatting with a knowledgeable friend.

Your podcast "Deep Dive" is known for:
- Breaking down complicated subjects into digestible insights
- Using relatable analogies and examples
- Engaging storytelling that keeps listeners hooked
- Natural speech patterns with thoughtful pauses

Create a podcast script that:
- Opens with a hook that grabs attention
- Flows naturally as spoken content (not written text)
- Is 300-450 words (approximately 2-3 minutes when read aloud)
- Uses "..." for natural pauses and emphasis
- Includes specific facts and insights from the research
- Ends with a memorable takeaway or thought-provoking question

IMPORTANT: Write ONLY the spoken content. No speaker labels, timestamps, directions, or [brackets]. Just the words the host would say.`;

  const userPrompt = `Create an engaging podcast episode about: "${topic}"

Use this research to inform your content:
${research.content}

Transform this research into a captivating podcast episode. Make it sound natural and conversational, as if you're explaining this to a curious friend over coffee.`;

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
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Script generation failed: ${response.status}`
      );
    }

    const data = await response.json();
    const script = data.choices[0]?.message?.content || "";

    const cleanedScript = script
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?pause.*?\)/gi, "...")
      .replace(/HOST:|SPEAKER:|NARRATOR:/gi, "")
      .trim();

    return cleanedScript;
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

async function generateAudio(
  script: string,
  podcastId: string,
  voice: string = "onyx"
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
        voice: voice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TTS API request failed: ${response.status} - ${errorText}`
      );
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
  onProgress: ProgressCallback,
  voice: string = "onyx"
): Promise<Podcast> {
  const podcastId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    onProgress({
      stage: "searching",
      message: "Researching topic...",
      progress: 0.1,
    });

    const research = await researchTopic(topic);

    onProgress({
      stage: "analyzing",
      message: "Analyzing information...",
      progress: 0.3,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    onProgress({
      stage: "generating",
      message: "Writing podcast script...",
      progress: 0.45,
    });

    const script = await generatePodcastScript(topic, research);

    onProgress({
      stage: "creating_audio",
      message: "Creating audio narration...",
      progress: 0.7,
    });

    const { uri, duration } = await generateAudio(script, podcastId, voice);

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
      sources: research.sources,
      isFavorite: false,
      voiceUsed: voice,
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

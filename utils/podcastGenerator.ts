import * as FileSystem from "expo-file-system";
import { Podcast, PodcastSeries } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

const TEST_MODE = true;

const TEST_SCRIPT = `Welcome back to Deep Dive, where we explore the fascinating corners of our world... Today, we're diving into something you've probably wondered about at some point.

You know, it's remarkable how much there is to discover when we really look into a topic. The research on this is genuinely surprising... Studies have shown patterns that most people never even consider.

Here's what I find most interesting... When experts first started examining this area, they expected to find one thing, but reality turned out to be far more complex. The data tells a story that challenges our assumptions.

Let me break this down for you... First, there's the fundamental aspect that forms the foundation. Then, we have the secondary elements that build upon that base. And finally, there are the emerging trends that are reshaping how we think about all of this.

What really stands out to me is how interconnected everything is. One small change can ripple outward in ways we never anticipated. It's a reminder that our world operates as a system, not as isolated parts.

So what does this mean for you? Well, the next time you encounter this topic, you'll see it through a completely different lens. And that's what I love about learning... it transforms how we experience everyday life.

That's all for today's episode. Keep exploring, keep questioning, and I'll see you in the next Deep Dive.`;

const TEST_SOURCES = [
  "Academic research publications and peer-reviewed journals",
  "Industry expert interviews and analysis",
  "Government statistical databases",
  "Historical archives and documentation",
  "Scientific research institutions",
];

const SERIES_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6",
];

export interface GenerationProgress {
  stage: "searching" | "analyzing" | "generating" | "creating_audio" | "planning" | "done";
  message: string;
  progress: number;
  episodeNumber?: number;
  totalEpisodes?: number;
}

export interface SeriesGenerationProgress extends GenerationProgress {
  episodeNumber?: number;
  totalEpisodes?: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface GenerationOptions {
  voice?: string;
  style?: "conversational" | "educational" | "storytelling" | "documentary" | "quick";
  depth?: "quick" | "standard" | "deep";
  approvedOutline?: Array<{
    title: string;
    focus: string;
    keyPoints?: string[];
  }>;
}

interface ResearchResult {
  content: string;
  sources: string[];
}

interface EpisodeOutline {
  title: string;
  focus: string;
  keyPoints: string[];
}

interface SeriesOutline {
  title: string;
  description: string;
  episodes: EpisodeOutline[];
}

async function researchTopic(topic: string): Promise<ResearchResult> {
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      content: `Research notes on "${topic}": This is a comprehensive overview of the topic covering key facts, statistics, recent developments, and expert perspectives.`,
      sources: TEST_SOURCES,
    };
  }

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
        model: "gpt-4o-mini",
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

async function planSeries(topic: string): Promise<SeriesOutline> {
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      title: topic,
      description: `A comprehensive exploration of ${topic}, covering its history, key concepts, notable figures, and lasting impact on our world today.`,
      episodes: [
        {
          title: "Origins and Foundations",
          focus: `The beginnings and foundational concepts of ${topic}`,
          keyPoints: ["Historical context", "Key figures", "Early developments"],
        },
        {
          title: "Key Developments",
          focus: `Major milestones and transformative moments in ${topic}`,
          keyPoints: ["Breakthrough moments", "Important discoveries", "Cultural shifts"],
        },
        {
          title: "Notable Figures",
          focus: `The influential people who shaped ${topic}`,
          keyPoints: ["Pioneers", "Innovators", "Their contributions"],
        },
        {
          title: "Modern Impact",
          focus: `How ${topic} influences our world today`,
          keyPoints: ["Current relevance", "Ongoing influence", "Future implications"],
        },
      ],
    };
  }

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const planPrompt = `You are planning a podcast series about: "${topic}"

Create an outline for 3-5 episodes that comprehensively cover this topic. Each episode should focus on a distinct aspect while building a cohesive narrative across the series.

Respond in this exact JSON format:
{
  "title": "Series title",
  "description": "Brief series description (1-2 sentences)",
  "episodes": [
    {
      "title": "Episode 1 title",
      "focus": "Brief description of this episode's focus",
      "keyPoints": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert podcast producer who creates engaging educational content. Always respond with valid JSON.",
          },
          { role: "user", content: planPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Series planning failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse series outline");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error planning series:", error);
    throw error;
  }
}

async function generatePodcastScript(
  topic: string,
  research: ResearchResult,
  episodeContext?: { title: string; focus: string; keyPoints: string[]; episodeNumber: number; totalEpisodes: number }
): Promise<string> {
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (episodeContext) {
      return TEST_SCRIPT
        .replace("this topic", `"${episodeContext.title}"`)
        .replace("Deep Dive", `${topic} - Episode ${episodeContext.episodeNumber}`);
    }
    return TEST_SCRIPT.replace("this topic", `"${topic}"`);
  }

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment."
    );
  }

  const isSeriesEpisode = !!episodeContext;
  
  const systemPrompt = `You are a charismatic podcast host known for making complex topics accessible and entertaining. You have a warm, conversational style that makes listeners feel like they're chatting with a knowledgeable friend.

Your podcast "${isSeriesEpisode ? topic : "Deep Dive"}" is known for:
- Breaking down complicated subjects into digestible insights
- Using relatable analogies and examples
- Engaging storytelling that keeps listeners hooked
- Natural speech patterns with thoughtful pauses

Create a podcast script that:
- Opens with a hook that grabs attention
${isSeriesEpisode ? `- Mentions this is episode ${episodeContext.episodeNumber} of ${episodeContext.totalEpisodes} in the series` : ""}
- Flows naturally as spoken content (not written text)
- Is 300-450 words (approximately 2-3 minutes when read aloud)
- Uses "..." for natural pauses and emphasis
- Includes specific facts and insights from the research
- Ends with a memorable takeaway${isSeriesEpisode ? " and teases the next episode" : ""}

IMPORTANT: Write ONLY the spoken content. No speaker labels, timestamps, directions, or [brackets]. Just the words the host would say.`;

  const episodePrompt = isSeriesEpisode 
    ? `
Episode ${episodeContext.episodeNumber} of ${episodeContext.totalEpisodes}: "${episodeContext.title}"

Focus: ${episodeContext.focus}

Key points to cover:
${episodeContext.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}
` 
    : "";

  const userPrompt = `Create an engaging podcast episode about: "${isSeriesEpisode ? episodeContext.title : topic}"
${episodePrompt}
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
        model: "gpt-4o-mini",
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
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);
    return {
      uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: estimatedDuration,
    };
  }

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
    const dirInfo = await FileSystem.getInfoAsync(audioDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    }

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
  options: GenerationOptions = {}
): Promise<Podcast> {
  const { voice = "onyx", style, depth } = options;
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
      style,
      depth,
    };

    return podcast;
  } catch (error) {
    console.error("Error generating podcast:", error);
    throw error;
  }
}

export interface SeriesGenerationResult {
  series: PodcastSeries;
  episodes: Podcast[];
}

export async function generatePodcastSeries(
  topic: string,
  onProgress: (progress: GenerationProgress) => void,
  options: GenerationOptions = {}
): Promise<SeriesGenerationResult> {
  const { voice = "onyx", style, depth, approvedOutline } = options;
  const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const coverColor = SERIES_COLORS[Math.floor(Math.random() * SERIES_COLORS.length)];

  try {
    let seriesOutline: SeriesOutline;
    
    if (approvedOutline && approvedOutline.length > 0) {
      onProgress({
        stage: "planning",
        message: "Using approved episode plan...",
        progress: 0.05,
      });
      seriesOutline = {
        title: topic,
        description: `A ${approvedOutline.length}-episode series exploring ${topic}`,
        episodes: approvedOutline.map((ep) => ({
          title: ep.title,
          focus: ep.focus,
          keyPoints: ep.keyPoints || [],
        })),
      };
    } else {
      onProgress({
        stage: "planning",
        message: "Planning episode structure...",
        progress: 0.05,
      });
      seriesOutline = await planSeries(topic);
    }
    
    const totalEpisodes = seriesOutline.episodes.length;
    const episodes: Podcast[] = [];
    let totalDuration = 0;

    for (let i = 0; i < totalEpisodes; i++) {
      const episodeOutline = seriesOutline.episodes[i];
      const episodeNumber = i + 1;
      const baseProgress = 0.1 + (i / totalEpisodes) * 0.85;
      const episodeProgressRange = 0.85 / totalEpisodes;

      onProgress({
        stage: "searching",
        message: `Episode ${episodeNumber}: Researching...`,
        progress: baseProgress,
        episodeNumber,
        totalEpisodes,
      });

      const research = await researchTopic(`${topic} - ${episodeOutline.focus}`);

      onProgress({
        stage: "generating",
        message: `Episode ${episodeNumber}: Writing script...`,
        progress: baseProgress + episodeProgressRange * 0.3,
        episodeNumber,
        totalEpisodes,
      });

      const script = await generatePodcastScript(topic, research, {
        ...episodeOutline,
        episodeNumber,
        totalEpisodes,
      });

      onProgress({
        stage: "creating_audio",
        message: `Episode ${episodeNumber}: Creating audio...`,
        progress: baseProgress + episodeProgressRange * 0.6,
        episodeNumber,
        totalEpisodes,
      });

      const podcastId = `${seriesId}_ep${episodeNumber}`;
      const { uri, duration } = await generateAudio(script, podcastId, voice);
      totalDuration += duration;

      const episode: Podcast = {
        id: podcastId,
        topic: seriesOutline.title,
        episodeTitle: episodeOutline.title,
        script,
        audioUri: uri,
        duration,
        createdAt: new Date().toISOString(),
        sources: research.sources,
        isFavorite: false,
        voiceUsed: voice,
        seriesId,
        episodeNumber,
        style,
        depth,
      };

      episodes.push(episode);
    }

    onProgress({
      stage: "done",
      message: "Series complete!",
      progress: 1.0,
      totalEpisodes,
    });

    const series: PodcastSeries = {
      id: seriesId,
      topic: seriesOutline.title,
      description: seriesOutline.description,
      episodeCount: totalEpisodes,
      totalDuration,
      createdAt: new Date().toISOString(),
      coverColor,
      isFavorite: false,
      style,
      depth,
    };

    return { series, episodes };
  } catch (error) {
    console.error("Error generating series:", error);
    throw error;
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

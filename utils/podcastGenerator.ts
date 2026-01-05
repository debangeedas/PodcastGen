import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { Podcast, PodcastSeries, getCurrentUserId, Source } from "./storage";
import { uploadWithTimeout, isCloudinaryConfigured } from "./cloudinaryStorage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const TAVILY_API_KEY = process.env.EXPO_PUBLIC_TAVILY_API_KEY || "";

const TEST_MODE = false; // Set to true to skip API calls and use dummy data

const TEST_SCRIPT = `Welcome back to Deep Dive, where we explore the fascinating corners of our world... Today, we're diving into something you've probably wondered about at some point.

You know, it's remarkable how much there is to discover when we really look into a topic. The research on this is genuinely surprising... Studies have shown patterns that most people never even consider.

Here's what I find most interesting... When experts first started examining this area, they expected to find one thing, but reality turned out to be far more complex. The data tells a story that challenges our assumptions.

Let me break this down for you... First, there's the fundamental aspect that forms the foundation. Then, we have the secondary elements that build upon that base. And finally, there are the emerging trends that are reshaping how we think about all of this.

What really stands out to me is how interconnected everything is. One small change can ripple outward in ways we never anticipated. It's a reminder that our world operates as a system, not as isolated parts.

So what does this mean for you? Well, the next time you encounter this topic, you'll see it through a completely different lens. And that's what I love about learning... it transforms how we experience everyday life.

That's all for today's episode. Keep exploring, keep questioning, and I'll see you in the next Deep Dive.`;

const TEST_SOURCES: Source[] = [
  {
    title: "Wikipedia - Example Topic",
    url: "https://en.wikipedia.org/wiki/Example",
  },
  {
    title: "Encyclopædia Britannica",
    url: "https://www.britannica.com",
  },
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
  sources: Source[];
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

async function findAndValidateSources(topic: string): Promise<Source[]> {
  // Try Tavily first for high-quality, AI-optimized search results
  if (TAVILY_API_KEY) {
    try {
      const tavilySources = await tavilySourceSearch(topic);
      if (tavilySources.length > 0) {
        return tavilySources;
      }
    } catch (error) {
      console.error("⚠️ Tavily search failed:", error);
    }
  }

  // Fallback to Wikipedia + DuckDuckGo
  return await basicSourceSearch(topic);
}

// Validate that a URL is properly formed and uses a valid protocol
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Use Tavily API for high-quality source discovery
async function tavilySourceSearch(topic: string): Promise<Source[]> {
  if (!TAVILY_API_KEY) {
    throw new Error("Tavily API key not configured");
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: topic,
        search_depth: "advanced", // Use advanced search for better quality
        include_raw_content: false, // We'll use Jina Reader for content extraction
        max_results: 5, // Get 5 results, we'll filter to top 3
        include_domains: [], // No domain restrictions
        exclude_domains: [], // No domain exclusions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Map Tavily results to Source objects
    const sources: Source[] = data.results
      .filter((result: any) => result.url && result.title && isValidUrl(result.url))
      .slice(0, 3) // Limit to top 3 sources
      .map((result: any) => ({
        title: result.title,
        url: result.url,
      }));

    return sources;
  } catch (error) {
    console.error("❌ Error in Tavily search:", error);
    throw error;
  }
}

// Search for real, working URLs from reliable APIs
async function basicSourceSearch(topic: string): Promise<Source[]> {
  const sources: Source[] = [];

  try {
    // Try Wikipedia first - most reliable source with guaranteed working URLs
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=3&format=json&origin=*`
    );

    if (wikiResponse.ok) {
      const wikiData = await wikiResponse.json();
      const titles = wikiData[1] || [];
      const descriptions = wikiData[2] || [];
      const urls = wikiData[3] || [];

      for (let i = 0; i < Math.min(titles.length, urls.length); i++) {
        if (titles[i] && urls[i] && isValidUrl(urls[i])) {
          sources.push({
            title: `${titles[i]} - Wikipedia`,
            url: urls[i],
          });
        }
      }
    }

    // Try DuckDuckGo Instant Answer API for additional sources
    const searchResponse = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`
    );

    if (searchResponse.ok) {
      const data = await searchResponse.json();

      // Add the main abstract source if available and URL is valid
      if (data.AbstractURL && data.AbstractSource && data.AbstractURL !== '' && isValidUrl(data.AbstractURL)) {
        // Check if this URL is already in sources (avoid duplicates)
        if (!sources.some(s => s.url === data.AbstractURL)) {
          sources.push({
            title: `${data.Heading || topic} - ${data.AbstractSource}`,
            url: data.AbstractURL,
          });
        }
      }

      // Add related topics with valid URLs
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const relatedTopic of data.RelatedTopics.slice(0, 2)) {
          if (relatedTopic.FirstURL && relatedTopic.Text && isValidUrl(relatedTopic.FirstURL)) {
            // Avoid duplicates
            if (!sources.some(s => s.url === relatedTopic.FirstURL)) {
              const titleMatch = relatedTopic.Text.match(/^([^-]+)/);
              const title = titleMatch ? titleMatch[1].trim() : relatedTopic.Text.substring(0, 60);
              sources.push({
                title: title,
                url: relatedTopic.FirstURL,
              });
            }
          }
        }
      }
    }

    // If still no sources, provide a Wikipedia search link as fallback
    if (sources.length === 0) {
      sources.push({
        title: `Wikipedia - ${topic}`,
        url: `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(topic)}`,
      });
    }

    return sources.slice(0, 3);
  } catch (error) {
    console.error("❌ Error in source search:", error);
    // Return Wikipedia search as ultimate fallback
    return [{
      title: `Wikipedia - ${topic}`,
      url: `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(topic)}`,
    }];
  }
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    // Use Jina AI Reader - a free service that can extract clean content from ANY URL
    // No API key required, works with news sites, blogs, academic articles, etc.
    // It bypasses CORS and paywalls, returning clean markdown content
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'text', // Get plain text instead of markdown
      },
    });

    if (!response.ok) {
      return '';
    }

    const text = await response.text();

    // Limit to 8000 characters per source for comprehensive content extraction
    // With 3 sources max, this gives ~24k chars total, well within GPT-4o-mini's 128k token limit
    // This captures full article context including examples, details, and conclusions
    const content = text.substring(0, 8000).trim();

    if (content.length < 100) {
      return '';
    }

    return content;
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return '';
  }
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

  // Find and validate high-quality sources
  const realSources = await findAndValidateSources(topic);

  // Fetch actual content from sources
  const sourceContents = await Promise.all(
    realSources.map(async (source) => {
      const content = await fetchArticleContent(source.url);
      return {
        title: source.title,
        url: source.url,
        content: content,
      };
    })
  );

  // Filter to sources that have valid content (at least 200 chars of substance)
  const sourcesWithContent = sourceContents.filter(s => {
    if (s.content.length < 200) return false;

    // Check if content looks like an actual article (not error page or redirect)
    const lowerContent = s.content.toLowerCase();
    const isError = lowerContent.includes('404') ||
                    lowerContent.includes('not found') ||
                    lowerContent.includes('page does not exist') ||
                    lowerContent.includes('error occurred');

    return !isError;
  });

  // Build context from actual article content
  let articleContext = '';
  if (sourcesWithContent.length > 0) {
    articleContext = '\n\n## Source Material\n\n';
    sourcesWithContent.forEach((source, index) => {
      articleContext += `### Source ${index + 1}: ${source.title}\n${source.content}\n\n`;
    });
  }

  const researchPrompt = `You are researching a topic for an educational podcast. ${sourcesWithContent.length > 0 ? 'Use the provided source material below as your PRIMARY reference.' : 'Provide comprehensive, accurate information from your knowledge base.'} Create engaging, accurate content for an audio script.
${articleContext}

## Topic
"${topic}"

## Research Requirements

### 1. Overview (2-3 paragraphs)
Provide a clear, comprehensive introduction to the topic. Include:
- What it is and why it matters
- Historical context or background
- Current relevance or significance

### 2. Key Facts & Insights (5-7 points)
Provide specific, interesting facts such as:
- Statistics with numbers and years
- Important dates or milestones
- Surprising discoveries or findings
- Scale/magnitude (size, reach, impact)

Example (good): "In 1969, the Apollo 11 mission successfully landed Neil Armstrong and Buzz Aldrin on the Moon, with Armstrong's first step occurring at 02:56 UTC on July 21."

Example (bad): "Apollo 11 was an important space mission."

### 3. Recent Developments (if applicable)
What's happened in the last 5-10 years related to this topic?

### 4. Common Misconceptions
What do people often get wrong about this topic? Include the reality.

Example:
- Misconception: "Vikings wore horned helmets"
- Reality: "No historical evidence supports this; likely originated from 19th-century romanticized artwork"

### 5. Interesting Angles
What makes this topic fascinating? Include:
- Surprising connections to other topics
- Counterintuitive aspects
- Human stories or personalities involved

## Important Guidelines
- Be specific with numbers, dates, and names
- Use concrete examples over generalizations
- Focus on information that translates well to audio
- Prioritize accuracy over speculation
- Make it interesting without sensationalizing`;

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
              "You are an expert research assistant with deep knowledge across science, history, technology, arts, and culture. You provide accurate, detailed information with specific facts, dates, statistics, and names. You structure information clearly and highlight what makes topics fascinating. You distinguish between established facts and areas of ongoing research or debate.",
          },
          { role: "user", content: researchPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
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

    // Use real sources if found, otherwise fallback
    let finalSources = realSources;
    if (finalSources.length === 0) {
      // Always provide at least one clickable source
      finalSources = [{
        title: `Wikipedia - ${topic}`,
        url: `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(topic)}`,
      }];
    }

    return {
      content: researchContent,
      sources: finalSources,
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

  const planPrompt = `You are creating a podcast series outline for: "${topic}"

## Your Task
Design a 3-5 episode series that comprehensively explores this topic. The series should tell a cohesive story while each episode stands alone as an engaging listen.

## Series Structure Approaches

### Historical Topics
- Episode 1: Origins and early beginnings
- Episode 2: Key developments and turning points
- Episode 3: Golden age or peak period
- Episode 4: Challenges, controversies, or decline
- Episode 5: Modern legacy and ongoing impact

### Scientific/Technical Topics
- Episode 1: Fundamentals and why it matters
- Episode 2: How it works (mechanisms/processes)
- Episode 3: Key discoveries and breakthroughs
- Episode 4: Current applications and real-world impact
- Episode 5: Future directions and open questions

### Cultural/Social Topics
- Episode 1: What it is and why it matters today
- Episode 2: Historical context and evolution
- Episode 3: Key figures and their contributions
- Episode 4: Cultural impact and influence
- Episode 5: Current state and future outlook

## Episode Requirements
Each episode needs:

**Title (Engaging & Specific)**
- NOT generic: "Episode 1: Introduction" ❌
- YES specific: "From Rags to Riches: The Birth of Jazz in New Orleans" ✅
- Use subtitles, questions, or intriguing phrases
- Hint at the story or surprise within

**Focus (One Clear Sentence)**
What angle or aspect does this episode explore?
Example: "How Louis Armstrong transformed jazz from ensemble music into a vehicle for individual expression"

**Key Points (3 Specific Items)**
Concrete topics to cover, not vague themes
- BAD: "Important developments" ❌
- GOOD: "Armstrong's Hot Five recordings of 1925-1928" ✅
- GOOD: "Introduction of scat singing and its influence on vocalists" ✅
- GOOD: "Migration from New Orleans to Chicago and impact on style" ✅

## Good Example

Topic: "The History of Jazz Music"

{
  "title": "Jazz: America's Original Art Form",
  "description": "From New Orleans street corners to concert halls worldwide, discover how jazz became one of the most influential musical movements in history.",
  "episodes": [
    {
      "title": "Birth in the Crescent City: Jazz's New Orleans Roots",
      "focus": "How African American communities in New Orleans blended African rhythms, blues, and ragtime to create jazz",
      "keyPoints": [
        "West African rhythmic traditions and the Congo Square gatherings",
        "Early pioneers: Buddy Bolden, Jelly Roll Morton, and the first jazz bands",
        "Storyville's role as an incubator for the new sound"
      ]
    },
    {
      "title": "The Armstrong Revolution: Jazz Becomes an Art",
      "focus": "How Louis Armstrong transformed jazz from ensemble music into a platform for virtuosic individual expression",
      "keyPoints": [
        "The Hot Five and Hot Seven recordings that changed everything",
        "Scat singing and the voice as an instrument",
        "The Great Migration and jazz's spread to Chicago"
      ]
    }
  ]
}

## Response Format
Respond with ONLY valid JSON in this exact structure. No additional text or explanation.

{
  "title": "Compelling series title (not just the topic)",
  "description": "What listeners will discover across the series (1-2 sentences)",
  "episodes": [
    {
      "title": "Specific, engaging episode title",
      "focus": "Clear one-sentence description of episode's angle",
      "keyPoints": ["Specific point 1", "Specific point 2", "Specific point 3"]
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
            content: "You are an expert podcast producer and series architect with experience creating compelling educational content for platforms like NPR, BBC, and Radiolab. You design series that are both informative and captivating. You always respond with valid JSON only.",
          },
          { role: "user", content: planPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Series planning failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.title || !parsed.description || !Array.isArray(parsed.episodes)) {
      throw new Error("Invalid series outline structure from API");
    }

    // Validate episodes
    for (const ep of parsed.episodes) {
      if (!ep.title || !ep.focus || !Array.isArray(ep.keyPoints)) {
        throw new Error("Invalid episode structure in series outline");
      }
    }

    return parsed;
  } catch (error) {
    console.error("Error planning series:", error);
    throw error;
  }
}

async function generatePodcastTitle(
  topic: string,
  research: ResearchResult,
  script?: string
): Promise<string> {
  if (TEST_MODE) {
    // Generate a creative test title
    const words = topic.split(/\s+/);
    if (words.length === 1) {
      return `The Fascinating World of ${topic}`;
    }
    return `Exploring ${topic}: A Deep Dive`;
  }

  if (!OPENAI_API_KEY) {
    // Fallback to a formatted version of the topic
    return topic
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const titlePrompt = `You are creating a podcast episode title. Generate a creative, engaging, and precise title that:
1. Accurately communicates what the content is about
2. Is intriguing and makes people want to listen
3. Is between 4-8 words (not too long, not too short)
4. Uses active, engaging language
5. Avoids generic phrases like "Everything You Need to Know" or "Complete Guide"

## Topic
"${topic}"

## Research Summary
${research.content.substring(0, 500)}${research.content.length > 500 ? '...' : ''}

${script ? `## Script Preview
${script.substring(0, 300)}...` : ''}

## Examples of Good Titles
- "The Year Without a Summer: How a Volcano Changed History"
- "From Zero to Hero: The Rise of Jazz in New Orleans"
- "Breaking the Sound Barrier: The Race to Supersonic Flight"
- "The Hidden Language of Bees: Decoding Nature's Communication"
- "When Time Stood Still: The Mystery of the Missing Summer"

## Examples of Bad Titles (Avoid These)
- "Everything About ${topic}" ❌
- "${topic} Explained" ❌
- "The Complete Guide to ${topic}" ❌
- "${topic}: A Deep Dive" ❌ (too generic)

Generate ONLY the title. No quotes, no explanation, just the title text.`;

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
            content: "You are an expert podcast producer who creates compelling, accurate episode titles. You always respond with just the title text, no quotes or additional explanation.",
          },
          { role: "user", content: titlePrompt },
        ],
        max_tokens: 50,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedTitle = data.choices[0]?.message?.content?.trim() || "";
    
    // Clean up the title (remove quotes if present)
    const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
    
    // Fallback if title is too short or empty
    if (cleanTitle.length < 5) {
      return topic
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return cleanTitle;
  } catch (error) {
    console.error("Error generating title:", error);
    // Fallback to formatted topic
    return topic
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

async function generatePodcastScript(
  topic: string,
  research: ResearchResult,
  episodeContext?: { title: string; focus: string; keyPoints: string[]; episodeNumber: number; totalEpisodes: number },
  depth: "quick" | "standard" | "deep" = "standard"
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
  
  const systemPrompt = `You are an award-winning podcast host known for making complex topics accessible, engaging, and memorable. Your voice is warm, enthusiastic, and conversational—like explaining something fascinating to a friend over coffee.

## Your Podcast Style
**"${isSeriesEpisode ? topic : "Deep Dive"}"** is known for:
- Opening with an intriguing hook or question that makes people lean in
- Using vivid analogies and concrete examples (not abstractions)
- Weaving in specific facts, dates, and numbers naturally
- Natural speech rhythm with strategic pauses
- Storytelling that creates "aha!" moments
- Ending with insights that change how listeners see the world

## Script Structure

### Opening Hook (${depth === "quick" ? "30-50" : depth === "deep" ? "60-80" : "40-60"} words)
Start with one of these approaches:
- A surprising fact or statistic
- A provocative question
- A brief story or scenario
- A common misconception to debunk

Example: "You know that feeling when you discover something that completely changes how you see everyday life? Well, buckle up... because what I'm about to share about [topic] is going to blow your mind."

### Main Content (${depth === "quick" 
  ? "250-300 words"
  : depth === "deep"
  ? "1400-1600 words"
  : "700-900 words"})
- Lead with the most interesting insight first
- Use "you know" and "here's the thing" for conversational flow
- Include 3-5 specific facts with numbers, dates, or names
- Use analogies to explain complex concepts
- Vary sentence length—mix short punchy statements with longer explanations
- Use natural transitions: "But here's where it gets interesting...", "Now, the surprising part is..."

${isSeriesEpisode ? `### Episode Context
- Briefly mention: "This is episode ${episodeContext.episodeNumber} of ${episodeContext.totalEpisodes} in our series"
- Reference previous episode if episodeNumber > 1: "Last time we explored [X], now we're diving into [Y]"
- Tease next episode at end: "Next time, we'll discover [next topic]"
` : ""}

### Closing (${depth === "quick" ? "40-60" : depth === "deep" ? "100-120" : "60-80"} words)
- Summarize the key insight in a memorable way
- Connect to listeners' lives: "So the next time you [X], remember [Y]"
- End with energy and curiosity${isSeriesEpisode ? "\n- Preview what's coming in the next episode" : ""}

## Voice & Style Guidelines
✅ DO:
- Use contractions (I'm, you're, it's, here's, that's)
- Include natural filler: "you know", "I mean", "right?", "actually"
- Use ellipsis (...) for thoughtful pauses
- Speak in second person ("you") to engage listeners
- Include rhetorical questions
- Express genuine enthusiasm

❌ DON'T:
- Use formal academic language
- Include speaker labels like "HOST:" or [PAUSE]
- Write stage directions or sound effects
- Use jargon without explanation
- Be overly dramatic or salesy

## Length & Pacing
${depth === "quick" 
  ? "- Total: 350-400 words (2-3 minutes spoken at ~150 words/minute)\n- Focus on key highlights and essential information"
  : depth === "deep"
  ? "- Total: 1600-1800 words (10-12 minutes spoken at ~150 words/minute)\n- Comprehensive exploration with multiple examples, case studies, and detailed explanations"
  : "- Total: 800-1000 words (5-7 minutes spoken at ~150 words/minute)\n- Balanced coverage with good detail and examples"}
- Average sentence: 15-20 words
- Mix short punchy sentences with longer flowing ones
- Strategic pauses (...) every 2-3 sentences

## Example Opening (Reference Quality)
"Here's something wild... Did you know that in 1816, there was literally no summer? Like, at all. Snow in July. Crops failing across the Northern Hemisphere. People called it 'The Year Without a Summer,' and the culprit? A massive volcanic eruption halfway around the world in Indonesia. Mount Tambora had just unleashed the most powerful eruption in recorded history, and its effects rippled across the entire planet. But here's the fascinating part... this disaster actually led to one of the greatest works of literature ever written. Let me explain..."

CRITICAL: Write ONLY the exact words the host speaks. No labels, no directions, no brackets—just pure spoken content.`;

  const episodePrompt = isSeriesEpisode 
    ? `
Episode ${episodeContext.episodeNumber} of ${episodeContext.totalEpisodes}: "${episodeContext.title}"

Focus: ${episodeContext.focus}

Key points to cover:
${episodeContext.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}
` 
    : "";

  const userPrompt = `Create an engaging podcast script about: "${isSeriesEpisode ? episodeContext.title : topic}"
${episodePrompt}

## Research Material
${research.content}

## Your Task
Transform this research into a captivating podcast script${depth === "quick" 
  ? " (350-400 words, 2-3 minutes)"
  : depth === "deep"
  ? " (1600-1800 words, 10-12 minutes)"
  : " (800-1000 words, 5-7 minutes)"}.

Remember:
- Start with a hook that grabs attention in the first 10 seconds
- Include 3-5 specific facts from the research (use actual numbers, dates, names)
- Use vivid analogies and examples to make abstract concepts concrete
- Speak naturally with contractions and conversational phrases
- End with an insight that sticks with the listener

Think: "What would make ME excited to learn about this?" Then write that script.`;

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
        max_tokens: 1200,
        temperature: 0.85,
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

// Split text into chunks that respect sentence boundaries
function splitIntoChunks(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  // Split by paragraphs first (double newline or single newline)
  const paragraphs = text.split(/\n\n|\n/).filter(p => p.trim());

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit
    if (currentChunk.length + paragraph.length + 2 > maxLength) {
      // If current chunk has content, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If paragraph itself is too long, split by sentences
      if (paragraph.length > maxLength) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxLength) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
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
    // Split script into chunks if it's too long (OpenAI has 4096 char limit)
    const chunks = splitIntoChunks(script, 4000);
    const audioBlobs: Blob[] = [];

    // Generate audio for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          input: chunk,
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

      const chunkBlob = await response.blob();
      audioBlobs.push(chunkBlob);
    }

    // If multiple chunks, we need to combine them
    const audioBlob = audioBlobs.length === 1
      ? audioBlobs[0]
      : new Blob(audioBlobs, { type: 'audio/mpeg' });
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to generate podcasts');
    }

    // Try Cloudinary upload first (works for all users, 25GB free)
    if (isCloudinaryConfigured) {
      try {
        const cloudinaryUrl = await uploadWithTimeout(audioBlob, podcastId, userId);
        return { uri: cloudinaryUrl, duration: estimatedDuration };
      } catch (error) {
        console.error("⚠️ Cloudinary upload failed:", error);
        // Fall through to local storage
      }
    }

    // Fallback: Local storage
    if (Platform.OS === 'web') {
      // On web, use blob URL (temporary - expires on page reload)
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      return { uri: audioBlobUrl, duration: estimatedDuration };
    } else {
      // On native, save to file system
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

      return { uri: audioUri, duration: estimatedDuration };
    }
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

    const script = await generatePodcastScript(topic, research, undefined, depth || "standard");

    onProgress({
      stage: "generating",
      message: "Creating episode title...",
      progress: 0.5,
    });

    const episodeTitle = await generatePodcastTitle(topic, research, script);

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
      topic: episodeTitle, // Use the generated creative title instead of raw topic
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
      }, depth || "standard");

      onProgress({
        stage: "generating",
        message: `Episode ${episodeNumber}: Creating title...`,
        progress: baseProgress + episodeProgressRange * 0.5,
        episodeNumber,
        totalEpisodes,
      });

      // Generate a creative title for this episode based on its focus and script
      const episodeTitle = await generatePodcastTitle(
        `${topic} - ${episodeOutline.focus}`,
        research,
        script
      );

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
        episodeTitle: episodeTitle, // Use the generated creative title
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

import { UserSettings } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const TEST_MODE = false;

export type ConversationPhase = 
  | "clarifying"
  | "planning"
  | "approval"
  | "ready";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  quickReplies?: string[];
  episodePlan?: EpisodePlan[];
  isTyping?: boolean;
}

export interface EpisodePlan {
  number: number;
  title: string;
  focus: string;
  keyPoints: string[];
}

export interface ConversationContext {
  originalTopic: string;
  refinedTopic: string;
  specificity: "specific" | "broad" | "general" | null;
  depth: "quick" | "standard" | "deep" | null;
  format: "single" | "series" | null;
  tone: "conversational" | "educational" | "storytelling" | null;
  voice: string;
  episodePlan: EpisodePlan[] | null;
  questionCount: number;
}

export interface ConversationState {
  phase: ConversationPhase;
  messages: ChatMessage[];
  context: ConversationContext;
  isLoading: boolean;
}

const TEST_FOLLOW_UP_RESPONSES: Record<number, { content: string; quickReplies: string[] }> = {
  0: {
    content: "Great topic! This could be explored in different ways. Would you like a single focused episode, or a multi-part series that dives into different aspects?",
    quickReplies: ["Single episode", "Multi-part series", "Surprise me"],
  },
  1: {
    content: "Are there specific aspects or angles you'd like me to focus on? For example, particular time periods, key figures, or themes you're most interested in?",
    quickReplies: ["Cover the main highlights", "I have specific interests", "You decide what's most interesting"],
  },
};

const TEST_SERIES_PLAN: EpisodePlan[] = [
  {
    number: 1,
    title: "Origins and Early Beginnings",
    focus: "The historical context and foundational events that sparked this topic",
    keyPoints: ["Historical background", "Key figures", "Initial developments"],
  },
  {
    number: 2,
    title: "The Golden Age",
    focus: "The peak period of development and major achievements",
    keyPoints: ["Major milestones", "Influential works", "Cultural impact"],
  },
  {
    number: 3,
    title: "Challenges and Controversies",
    focus: "The obstacles, debates, and turning points",
    keyPoints: ["Key conflicts", "Different perspectives", "Pivotal moments"],
  },
  {
    number: 4,
    title: "Modern Legacy and Impact",
    focus: "How this topic continues to influence our world today",
    keyPoints: ["Contemporary relevance", "Lasting effects", "Future outlook"],
  },
];

export function createInitialState(
  topic: string,
  voice: string,
  preferredDepth?: "quick" | "standard" | "deep",
  preferredTone?: "conversational" | "educational" | "storytelling"
): ConversationState {
  return {
    phase: "clarifying",
    messages: [
      {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: topic,
        timestamp: Date.now(),
      },
    ],
    context: {
      originalTopic: topic,
      refinedTopic: topic,
      specificity: null,
      depth: preferredDepth || null,
      format: null,
      tone: preferredTone || null,
      voice,
      episodePlan: null,
      questionCount: 0,
    },
    isLoading: true,
  };
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function analyzeTopicBreadth(topic: string): "specific" | "broad" {
  const broadIndicators = [
    "history of",
    "introduction to",
    "overview of",
    "guide to",
    "renaissance",
    "civilization",
    "war",
    "revolution",
    "movement",
    "era",
    "age of",
    "science of",
    "world of",
  ];
  
  const lowerTopic = topic.toLowerCase();
  const isBroad = broadIndicators.some(indicator => lowerTopic.includes(indicator));
  
  if (isBroad || topic.split(" ").length <= 4) {
    return "broad";
  }
  
  return topic.includes("?") || topic.includes("how") || topic.includes("why") 
    ? "specific" 
    : "broad";
}

function parseUserResponse(
  response: string,
  questionNumber: number
): Partial<ConversationContext> {
  const lowerResponse = response.toLowerCase();

  if (questionNumber === 0) {
    // Question about format (single vs series)
    if (lowerResponse.includes("single") || lowerResponse.includes("one episode") || lowerResponse.includes("focused")) {
      return { specificity: "specific", format: "single" };
    } else if (lowerResponse.includes("multi") || lowerResponse.includes("series") || lowerResponse.includes("multiple")) {
      return { specificity: "broad", format: "series" };
    } else if (lowerResponse.includes("surprise")) {
      // Let the AI decide based on topic breadth
      return { specificity: "general" };
    }
    return { specificity: "general" };
  }

  if (questionNumber === 1) {
    // Question about specific interests/focus areas
    if (lowerResponse.includes("specific") || lowerResponse.includes("particular") || lowerResponse.includes("focus on")) {
      // User has specific interests - mark as refined
      return { refinedTopic: response };
    } else if (lowerResponse.includes("highlights") || lowerResponse.includes("main") || lowerResponse.includes("overview")) {
      return { specificity: "broad" };
    }
    // User wants us to decide
    return {};
  }

  return {};
}

export async function getNextAIResponse(
  state: ConversationState,
  userMessage?: string
): Promise<{ message: ChatMessage; updatedContext: ConversationContext; nextPhase: ConversationPhase }> {
  const { context } = state;
  let updatedContext = { ...context };
  
  if (userMessage && context.questionCount > 0) {
    const parsed = parseUserResponse(userMessage, context.questionCount - 1);
    updatedContext = { ...updatedContext, ...parsed };
  }
  
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));

    // With preferences set, we only ask 1-2 topic-specific questions
    if (context.questionCount < 2) {
      const response = TEST_FOLLOW_UP_RESPONSES[context.questionCount];
      updatedContext.questionCount = context.questionCount + 1;

      return {
        message: {
          id: generateMessageId(),
          role: "assistant",
          content: response.content,
          timestamp: Date.now(),
          quickReplies: response.quickReplies,
        },
        updatedContext,
        nextPhase: "clarifying",
      };
    }
    
    if (updatedContext.format === "series" || updatedContext.specificity === "broad") {
      const planMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: `Based on our conversation, I think a multi-episode series would work perfectly for "${context.originalTopic}". Here's my proposed episode plan:`,
        timestamp: Date.now(),
        episodePlan: TEST_SERIES_PLAN.map((ep) => ({
          ...ep,
          title: `${context.originalTopic}: ${ep.title}`,
        })),
      };
      
      updatedContext.episodePlan = planMessage.episodePlan || null;
      updatedContext.format = "series";
      
      return {
        message: planMessage,
        updatedContext,
        nextPhase: "approval",
      };
    }
    
    updatedContext.format = "single";
    const depthLabel = updatedContext.depth === "quick" ? "quick 5-minute" : updatedContext.depth === "deep" ? "comprehensive deep-dive" : "standard";
    const toneLabel = updatedContext.tone || "conversational";
    return {
      message: {
        id: generateMessageId(),
        role: "assistant",
        content: `Perfect! I have everything I need. Based on your profile preferences, I'll create a ${depthLabel} ${toneLabel} episode about "${context.originalTopic}".\n\nReady to generate your podcast?`,
        timestamp: Date.now(),
        quickReplies: ["Generate podcast", "Let me adjust something"],
      },
      updatedContext,
      nextPhase: "ready",
    };
  }
  
  return await getAIResponseFromAPI(state, userMessage, updatedContext);
}

async function getAIResponseFromAPI(
  state: ConversationState,
  userMessage: string | undefined,
  updatedContext: ConversationContext
): Promise<{ message: ChatMessage; updatedContext: ConversationContext; nextPhase: ConversationPhase }> {
  console.log("🔑 API Key status:", OPENAI_API_KEY ? `Present (${OPENAI_API_KEY.substring(0, 10)}...)` : "MISSING");

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file and restart the app.");
  }

  const systemPrompt = `You are an enthusiastic podcast creation assistant helping users create educational podcasts on any topic. The user has already set their preferred episode length (${updatedContext.depth || "standard"}) and tone (${updatedContext.tone || "conversational"}) in their profile.

Your goal is to ask 1-2 TOPIC-SPECIFIC questions to understand what aspects of the topic they want to explore, then create an episode plan.

## Current Context
- Topic: "${updatedContext.originalTopic}"
- Questions asked: ${updatedContext.questionCount}
- Format preference: ${updatedContext.format || "not yet determined"}
- Depth preference: ${updatedContext.depth || "standard"} (from user profile)
- Tone preference: ${updatedContext.tone || "conversational"} (from user profile)

## What to Ask (1-2 questions max)

### Question 1: Format & Scope
Assess if the topic is broad enough for a series. Ask whether they want:
- A single focused episode
- A multi-part series exploring different aspects

Example: "Great topic! This could be explored in different ways. Would you like a single focused episode, or a multi-part series that dives into different aspects?"

### Question 2 (Optional): Specific Focus
If the topic is broad, ask about specific angles, time periods, figures, or themes they're most interested in.

Examples:
- For "European Renaissance": "Are you interested in the art and artists, the political changes, the scientific revolution, or a broad overview?"
- For "Quantum Computing": "Would you like to focus on how it works, its practical applications, or its potential impact on society?"
- For "Jazz History": "Any particular era or artists you'd like to focus on, or should I cover the evolution from its origins to today?"

DO NOT ask about:
- Episode length/depth (already set in profile)
- Tone/style (already set in profile)
- Voice preference (already set)

## After Gathering Info

### For Series (if format="series" or topic is broad)
Create a 3-5 episode plan with:
- Descriptive, engaging titles
- Clear focus for each episode
- 3 specific key points per episode
- Set "isSeries": true, "isReady": false

Example episode:
{
  "number": 1,
  "title": "The Birth of Jazz: From New Orleans to the World",
  "focus": "How jazz emerged from African American communities in early 20th century New Orleans",
  "keyPoints": [
    "African and Caribbean musical influences that shaped jazz",
    "Key pioneers: Buddy Bolden, Jelly Roll Morton, Louis Armstrong",
    "The Great Migration and jazz's spread to Chicago and New York"
  ]
}

### For Single Episode
Confirm you're ready to generate with personalized message mentioning their profile preferences.
Example: "Perfect! I have everything I need. Based on your preferences, I'll create a ${updatedContext.depth || "standard"} ${updatedContext.tone || "conversational"} episode about '${updatedContext.originalTopic}'.\n\nReady to generate your podcast?"
Set "isReady": true, "isSeries": false

## Response Format (ALWAYS valid JSON)
{
  "content": "Your conversational message (2-3 sentences)",
  "quickReplies": ["Specific option 1", "Specific option 2", "Specific option 3"],
  "episodePlan": null or [episode objects],
  "isReady": false or true,
  "isSeries": false or true
}

## Important Rules
- Keep messages concise and friendly (2-3 sentences max)
- Quick replies should be specific, actionable options
- Episode titles should be engaging and descriptive, not generic
- Each episode should have a distinct focus
- ALWAYS return valid JSON, nothing else`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...state.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
  
  if (userMessage) {
    messages.push({ role: "user" as const, content: userMessage });
  }

  console.log("📡 Making API call to OpenAI...");
  console.log("📝 Messages:", messages.length, "messages");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error Response:", errorData);
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    console.log("✅ API call successful!");
    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    console.log("📄 Response content length:", content.length);

    let parsed;
    try {
      parsed = JSON.parse(content);

      // Validate required fields
      if (!parsed.content || !Array.isArray(parsed.quickReplies)) {
        throw new Error("Invalid response structure from API");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      // Fallback with the raw content
      parsed = {
        content: content || "I'm having trouble processing that. Could you rephrase?",
        quickReplies: ["Single episode", "Multi-part series", "Start over"],
        episodePlan: null,
        isReady: false,
        isSeries: false,
      };
    }
    
    updatedContext.questionCount = updatedContext.questionCount + 1;
    
    if (parsed.episodePlan) {
      updatedContext.episodePlan = parsed.episodePlan;
      updatedContext.format = "series";
    }
    
    let nextPhase: ConversationPhase = "clarifying";
    if (parsed.isReady) {
      nextPhase = "ready";
    } else if (parsed.episodePlan) {
      nextPhase = "approval";
    }
    
    return {
      message: {
        id: generateMessageId(),
        role: "assistant",
        content: parsed.content,
        timestamp: Date.now(),
        quickReplies: parsed.quickReplies,
        episodePlan: parsed.episodePlan,
      },
      updatedContext,
      nextPhase,
    };
  } catch (error) {
    console.error("Error getting AI response:", error);
    throw error;
  }
}

export async function regenerateEpisodePlan(
  context: ConversationContext,
  feedback: string
): Promise<EpisodePlan[]> {
  if (TEST_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return TEST_SERIES_PLAN.map((ep, index) => ({
      ...ep,
      number: index + 1,
      title: `${context.originalTopic}: ${ep.title} (Updated)`,
    }));
  }
  
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }
  
  const prompt = `You are revising a podcast series episode plan based on user feedback.

## Original Topic
"${context.originalTopic}"

## User Feedback
"${feedback}"

## Your Task
Create a revised 3-5 episode plan that addresses the user's feedback. Each episode should:
- Have a specific, engaging title (not generic like "Episode 1")
- Have a clear, distinct focus
- Include 3 specific key points to cover

## Good Example
Topic: "The History of Jazz Music"
Feedback: "Focus more on specific artists and their innovations"

[
  {
    "number": 1,
    "title": "Louis Armstrong: From New Orleans to Worldwide Fame",
    "focus": "How Louis Armstrong revolutionized jazz with his virtuosic trumpet playing and scat singing",
    "keyPoints": [
      "His early years in New Orleans and influence of King Oliver",
      "The Hot Five and Hot Seven recordings that changed jazz",
      "Introduction of scat singing and his influence on vocalists"
    ]
  },
  {
    "number": 2,
    "title": "Duke Ellington: The Composer Who Elevated Jazz",
    "focus": "Duke Ellington's sophisticated compositions and his Cotton Club orchestra",
    "keyPoints": [
      "Transition from stride piano to big band leadership",
      "Signature compositions like 'Mood Indigo' and 'Sophisticated Lady'",
      "Collaboration with Billy Strayhorn and the Ellington sound"
    ]
  }
]

## Instructions
- Create 3-5 episodes (adjust count based on feedback if requested)
- Make titles descriptive and engaging
- Ensure each episode has a unique angle
- Respond with ONLY a JSON array, no other text

## Response Format
[{"number": 1, "title": "...", "focus": "...", "keyPoints": ["...", "...", "..."]}]`;

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
            content: "You are a podcast producer creating episode plans. Always respond with valid JSON arrays only, no additional text."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";

    // Parse JSON response - with JSON mode it might be wrapped in an object
    const parsed = JSON.parse(content);

    // Handle both array directly or wrapped in object with "episodes" key
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.episodes && Array.isArray(parsed.episodes)) {
      return parsed.episodes;
    } else if (parsed.plan && Array.isArray(parsed.plan)) {
      return parsed.plan;
    }

    throw new Error("Invalid episode plan format returned from API");
  } catch (error) {
    console.error("Error regenerating plan:", error);
    throw error;
  }
}

export interface GenerationParams {
  topic: string;
  isSeries: boolean;
  depth: "quick" | "standard" | "deep";
  tone: "conversational" | "educational" | "storytelling";
  style: "conversational" | "educational" | "storytelling" | "documentary" | "quick";
  voice: string;
  episodePlan: EpisodePlan[] | null;
  approvedOutline: Array<{ title: string; focus: string; keyPoints?: string[] }> | null;
}

export function getGenerationParams(context: ConversationContext): GenerationParams {
  const toneToStyle = (tone: string | null): GenerationParams["style"] => {
    switch (tone) {
      case "conversational": return "conversational";
      case "educational": return "educational";
      case "storytelling": return "storytelling";
      default: return "conversational";
    }
  };
  
  return {
    topic: context.refinedTopic || context.originalTopic,
    isSeries: context.format === "series",
    depth: context.depth || "standard",
    tone: context.tone || "conversational",
    style: toneToStyle(context.tone),
    voice: context.voice,
    episodePlan: context.episodePlan,
    approvedOutline: context.episodePlan?.map((ep) => ({
      title: ep.title,
      focus: ep.focus,
      keyPoints: ep.keyPoints,
    })) || null,
  };
}

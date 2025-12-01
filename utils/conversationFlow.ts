import { UserSettings } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const TEST_MODE = true;

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
    content: "I'd love to help you explore this topic! What format works best for you?\n\nWould you like a single focused episode, or a multi-part series that covers different aspects?",
    quickReplies: ["Single episode", "Multi-part series", "I'm not sure yet"],
  },
  1: {
    content: "Got it! And how much time do you have? Would you prefer:\n\nA quick 5-minute summary, a standard 10-15 minute episode, or a comprehensive deep-dive that really explores the nuances?",
    quickReplies: ["Quick summary (5 min)", "Standard episode (10-15 min)", "Deep dive (20+ min)"],
  },
  2: {
    content: "One more thing - what style would work best for you?\n\nWould you like it conversational and casual, more educational and structured, or narrative storytelling style?",
    quickReplies: ["Conversational", "Educational", "Storytelling"],
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

export function createInitialState(topic: string, voice: string): ConversationState {
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
      depth: null,
      format: null,
      tone: null,
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
    if (lowerResponse.includes("single") || lowerResponse.includes("one episode") || lowerResponse.includes("focused")) {
      return { specificity: "specific", format: "single" };
    } else if (lowerResponse.includes("multi") || lowerResponse.includes("series") || lowerResponse.includes("multiple")) {
      return { specificity: "broad", format: "series" };
    }
    return { specificity: "general" };
  }
  
  if (questionNumber === 1) {
    if (lowerResponse.includes("quick") || lowerResponse.includes("5 min") || lowerResponse.includes("summary")) {
      return { depth: "quick" };
    } else if (lowerResponse.includes("deep") || lowerResponse.includes("20") || lowerResponse.includes("comprehensive")) {
      return { depth: "deep" };
    }
    return { depth: "standard" };
  }
  
  if (questionNumber === 2) {
    if (lowerResponse.includes("conversational") || lowerResponse.includes("casual")) {
      return { tone: "conversational" };
    } else if (lowerResponse.includes("educational") || lowerResponse.includes("structured")) {
      return { tone: "educational" };
    } else if (lowerResponse.includes("story") || lowerResponse.includes("narrative")) {
      return { tone: "storytelling" };
    }
    return { tone: "conversational" };
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
    
    if (context.questionCount < 3) {
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
    return {
      message: {
        id: generateMessageId(),
        role: "assistant",
        content: `Perfect! I have everything I need. I'll create a ${updatedContext.depth || "standard"} ${updatedContext.tone || "conversational"} episode about "${context.originalTopic}".\n\nReady to generate your podcast?`,
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
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }
  
  const systemPrompt = `You are a helpful podcast creation assistant. You're having a conversation to understand what kind of podcast the user wants.

Current context:
- Original topic: "${updatedContext.originalTopic}"
- Questions asked so far: ${updatedContext.questionCount}
- Specificity preference: ${updatedContext.specificity || "unknown"}
- Depth preference: ${updatedContext.depth || "unknown"}
- Format preference: ${updatedContext.format || "unknown"}
- Tone preference: ${updatedContext.tone || "unknown"}

Rules:
1. Ask only 2-4 clarifying questions total, one at a time
2. Questions should be simple and conversational
3. Always provide 2-3 quick reply suggestions in your response
4. If the topic is broad, ask if they want a specific focus or general overview
5. After gathering enough info, either:
   - For broad topics: Suggest a series with 3-5 episode titles
   - For specific topics: Confirm you're ready to generate

Format your response as JSON:
{
  "content": "Your message here",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "episodePlan": null or [{"number": 1, "title": "...", "focus": "...", "keyPoints": ["..."]}],
  "isReady": false,
  "isSeries": false
}`;

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
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        content,
        quickReplies: ["Continue", "Start over"],
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
  
  const prompt = `Create a revised episode plan for a podcast series about "${context.originalTopic}".

User feedback: "${feedback}"

Create 3-5 episodes. For each episode provide:
- number (1-5)
- title (engaging and specific)
- focus (one sentence describing what this episode covers)
- keyPoints (3 main topics to cover)

Respond with JSON array only:
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
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "[]";
    return JSON.parse(content);
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

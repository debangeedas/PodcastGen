import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { getSettings } from "@/utils/storage";
import {
  ConversationState,
  ChatMessage,
  EpisodePlan,
  createInitialState,
  getNextAIResponse,
  generateMessageId,
  regenerateEpisodePlan,
  getGenerationParams,
} from "@/utils/conversationFlow";

type ChatCreationScreenProps = {
  navigation: NativeStackNavigationProp<CreateStackParamList, "ChatCreation">;
  route: RouteProp<CreateStackParamList, "ChatCreation">;
};

export default function ChatCreationScreen({ navigation, route }: ChatCreationScreenProps) {
  const { topic } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const typingDots = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<ConversationState | null>(null);
  const [inputText, setInputText] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const initConversation = async () => {
      const settings = await getSettings();
      const initialState = createInitialState(topic, settings.preferredVoice);
      setState(initialState);
      
      try {
        const { message, updatedContext, nextPhase } = await getNextAIResponse(initialState);
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: nextPhase,
            messages: [...prev.messages, message],
            context: updatedContext,
            isLoading: false,
          };
        });
      } catch (error) {
        console.error("Error getting initial response:", error);
        setState((prev) => prev ? { ...prev, isLoading: false } : prev);
        Alert.alert("Error", "Failed to start conversation. Please try again.");
      }
    };
    
    initConversation();
  }, [topic]);

  useEffect(() => {
    if (state?.isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDots, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [state?.isLoading, typingDots]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state?.messages, scrollToBottom]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !state || state.isLoading) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: messageText.trim(),
      timestamp: Date.now(),
    };
    
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
      };
    });
    
    setInputText("");
    
    try {
      const currentState = {
        ...state,
        messages: [...state.messages, userMessage],
      };
      
      const { message, updatedContext, nextPhase } = await getNextAIResponse(
        currentState,
        messageText.trim()
      );
      
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: nextPhase,
          messages: [...prev.messages, message],
          context: updatedContext,
          isLoading: false,
        };
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setState((prev) => prev ? { ...prev, isLoading: false } : prev);
      Alert.alert("Error", "Failed to get response. Please try again.");
    }
  };

  const handleQuickReply = (reply: string) => {
    if (reply.toLowerCase().includes("generate podcast")) {
      handleGenerate();
      return;
    }
    handleSendMessage(reply);
  };

  const handleApprove = async () => {
    if (!state) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const params = getGenerationParams(state.context);
    navigation.replace("Generating", {
      topic: params.topic,
      isSeries: params.isSeries,
      conversationParams: params,
    });
  };

  const handleModify = async () => {
    if (!state) return;
    
    Alert.prompt(
      "Modify Plan",
      "What would you like me to change about the episode plan?",
      async (feedback) => {
        if (!feedback?.trim()) return;
        
        setIsRegenerating(true);
        try {
          const newPlan = await regenerateEpisodePlan(state.context, feedback);
          
          const updateMessage: ChatMessage = {
            id: generateMessageId(),
            role: "assistant",
            content: "I've updated the episode plan based on your feedback:",
            timestamp: Date.now(),
            episodePlan: newPlan,
          };
          
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, updateMessage],
              context: {
                ...prev.context,
                episodePlan: newPlan,
              },
            };
          });
        } catch (error) {
          Alert.alert("Error", "Failed to regenerate plan. Please try again.");
        }
        setIsRegenerating(false);
      },
      "plain-text"
    );
  };

  const handleSwitchToSingle = async () => {
    if (!state) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const params = getGenerationParams(state.context);
    navigation.replace("Generating", {
      topic: params.topic,
      isSeries: false,
      conversationParams: { ...params, isSeries: false, episodePlan: null },
    });
  };

  const handleGenerate = async () => {
    if (!state) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const params = getGenerationParams(state.context);
    navigation.replace("Generating", {
      topic: params.topic,
      isSeries: params.isSeries,
      conversationParams: params,
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    
    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        {!isUser ? (
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <Feather name="mic" size={16} color="#FFFFFF" />
          </View>
        ) : null}
        
        <View style={[styles.messageWrapper, isUser && styles.userMessageWrapper]}>
          <View
            style={[
              styles.messageBubble,
              isUser
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText
              style={[
                styles.messageText,
                { color: isUser ? "#FFFFFF" : theme.text },
              ]}
            >
              {item.content}
            </ThemedText>
          </View>
          
          {item.episodePlan ? (
            <View style={styles.planContainer}>
              <Card style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Feather name="layers" size={18} color={theme.primary} />
                  <ThemedText type="h4" style={styles.planTitle}>
                    Episode Plan
                  </ThemedText>
                </View>
                
                {item.episodePlan.map((episode) => (
                  <View key={episode.number} style={styles.episodeItem}>
                    <View style={[styles.episodeNumber, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.episodeNumberText}>
                        {episode.number}
                      </ThemedText>
                    </View>
                    <View style={styles.episodeContent}>
                      <ThemedText type="body" style={styles.episodeTitle}>
                        {episode.title}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={[styles.episodeFocus, { color: theme.textSecondary }]}
                      >
                        {episode.focus}
                      </ThemedText>
                    </View>
                  </View>
                ))}
                
                <View style={styles.planActions}>
                  <Pressable
                    onPress={handleApprove}
                    style={[styles.planButton, { backgroundColor: theme.primary }]}
                  >
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.planButtonText}>Approve</ThemedText>
                  </Pressable>
                  
                  <Pressable
                    onPress={handleModify}
                    disabled={isRegenerating}
                    style={[
                      styles.planButton,
                      styles.planButtonOutline,
                      { borderColor: theme.primary },
                    ]}
                  >
                    {isRegenerating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Feather name="edit-2" size={16} color={theme.primary} />
                        <ThemedText style={[styles.planButtonText, { color: theme.primary }]}>
                          Modify
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                  
                  <Pressable
                    onPress={handleSwitchToSingle}
                    style={[
                      styles.planButton,
                      styles.planButtonOutline,
                      { borderColor: theme.textSecondary },
                    ]}
                  >
                    <Feather name="mic" size={16} color={theme.textSecondary} />
                    <ThemedText style={[styles.planButtonText, { color: theme.textSecondary }]}>
                      Single
                    </ThemedText>
                  </Pressable>
                </View>
              </Card>
            </View>
          ) : null}
          
          {item.quickReplies && !item.episodePlan ? (
            <View style={styles.quickRepliesContainer}>
              {item.quickReplies.map((reply) => (
                <Pressable
                  key={reply}
                  onPress={() => handleQuickReply(reply)}
                  style={({ pressed }) => [
                    styles.quickReplyChip,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.primary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.quickReplyText, { color: theme.primary }]}>
                    {reply}
                  </ThemedText>
                </Pressable>
              ))}
              
              {state?.phase === "ready" ? (
                <Pressable
                  onPress={handleGenerate}
                  style={[styles.generateButton, { backgroundColor: theme.primary }]}
                >
                  <Feather name="play" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.generateButtonText}>
                    Generate Podcast
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!state?.isLoading) return null;
    
    return (
      <View style={styles.messageRow}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
          <Feather name="mic" size={16} color="#FFFFFF" />
        </View>
        <View style={[styles.messageBubble, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.typingDots}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.typingDot,
                  { backgroundColor: theme.textSecondary },
                  {
                    opacity: typingDots.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: i === 0 ? [0.3, 1, 0.3] : i === 1 ? [0.3, 0.3, 1] : [1, 0.3, 0.3],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (!state) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Starting conversation...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={state.messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: insets.bottom + 80 },
        ]}
        ListFooterComponent={renderTypingIndicator}
        showsVerticalScrollIndicator={false}
      />
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
            editable={!state.isLoading}
          />
          <Pressable
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || state.isLoading}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? theme.primary : theme.backgroundDefault,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  messageList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  userMessageRow: {
    flexDirection: "row-reverse",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  messageWrapper: {
    flex: 1,
    alignItems: "flex-start",
  },
  userMessageWrapper: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  quickRepliesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    maxWidth: "85%",
  },
  quickReplyChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  planContainer: {
    marginTop: Spacing.md,
    width: "100%",
    maxWidth: 340,
  },
  planCard: {
    padding: Spacing.lg,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  planTitle: {
    marginBottom: 0,
  },
  episodeItem: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  episodeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  episodeNumberText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  episodeContent: {
    flex: 1,
  },
  episodeTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  episodeFocus: {
    lineHeight: 18,
  },
  planActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  planButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  planButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  planButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

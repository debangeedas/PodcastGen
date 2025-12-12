import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateScreen from "@/screens/CreateScreen";
import ChatCreationScreen from "@/screens/ChatCreationScreen";
import GeneratingScreen from "@/screens/GeneratingScreen";
import PlayerScreen from "@/screens/PlayerScreen";
import SeriesDetailScreen from "@/screens/SeriesDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { GenerationParams } from "@/utils/conversationFlow";

export type CreateStackParamList = {
  Create: undefined;
  ChatCreation: { topic: string };
  Generating: { topic: string; isSeries?: boolean; conversationParams?: GenerationParams };
  Player: { podcastId: string };
  SeriesDetail: { seriesId: string };
};

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark, showTopBar: true }),
      }}
    >
      <Stack.Screen
        name="Create"
        component={CreateScreen}
        options={{}}
      />
      <Stack.Screen
        name="ChatCreation"
        component={ChatCreationScreen}
        options={{
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Generating"
        component={GeneratingScreen}
        options={{
          presentation: "modal",
          gestureEnabled: false,
          ...getCommonScreenOptions({ theme, isDark, showTopBar: false }),
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: "modal",
          ...getCommonScreenOptions({ theme, isDark, showTopBar: false }),
        }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{}}
      />
    </Stack.Navigator>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateScreen from "@/screens/CreateScreen";
import GeneratingScreen from "@/screens/GeneratingScreen";
import PlayerScreen from "@/screens/PlayerScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type CreateStackParamList = {
  Create: undefined;
  Generating: { topic: string; isSeries?: boolean };
  Player: { podcastId: string };
  SeriesDetail: { seriesId: string };
};

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Create"
        component={CreateScreen}
        options={{
          headerTitle: () => <HeaderTitle title="PodcastGen" />,
        }}
      />
      <Stack.Screen
        name="Generating"
        component={GeneratingScreen}
        options={{
          headerTitle: "",
          presentation: "modal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          headerTitle: "",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}

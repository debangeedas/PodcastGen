import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LibraryScreen from "@/screens/LibraryScreen";
import PlayerScreen from "@/screens/PlayerScreen";
import SeriesDetailScreen from "@/screens/SeriesDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type LibraryStackParamList = {
  Library: undefined;
  Player: { podcastId: string };
  SeriesDetail: { seriesId: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerTitle: "My Podcasts",
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
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{
          headerTitle: "Series",
        }}
      />
    </Stack.Navigator>
  );
}

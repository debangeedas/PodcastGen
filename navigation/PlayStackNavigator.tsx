import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PlayScreen from "@/screens/PlayScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type PlayStackParamList = {
  Play: undefined;
};

const Stack = createNativeStackNavigator<PlayStackParamList>();

export default function PlayStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Play"
        component={PlayScreen}
        options={{
          headerTitle: "Now Playing",
        }}
      />
    </Stack.Navigator>
  );
}

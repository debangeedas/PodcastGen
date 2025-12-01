import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

interface AnimatedWaveformProps {
  isPlaying: boolean;
  color: string;
}

const BAR_COUNT = 20;

function WaveformBar({
  index,
  isPlaying,
  color,
}: {
  index: number;
  isPlaying: boolean;
  color: string;
}) {
  const height = useSharedValue(0.3);

  useEffect(() => {
    if (isPlaying) {
      height.value = withDelay(
        index * 50,
        withRepeat(
          withTiming(0.3 + Math.random() * 0.7, {
            duration: 300 + Math.random() * 400,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(0.3, { duration: 300 });
    }

    return () => {
      cancelAnimation(height);
    };
  }, [isPlaying, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value * 100}%`,
    opacity: 0.4 + height.value * 0.5,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function AnimatedWaveform({ isPlaying, color }: AnimatedWaveformProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <WaveformBar key={index} index={index} isPlaying={isPlaying} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 8,
  },
});

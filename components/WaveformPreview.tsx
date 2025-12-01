import React from "react";
import { View, StyleSheet } from "react-native";

interface WaveformPreviewProps {
  color: string;
}

export function WaveformPreview({ color }: WaveformPreviewProps) {
  const bars = [0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6];

  return (
    <View style={styles.container}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: `${height * 100}%`,
              opacity: 0.4 + height * 0.4,
            },
          ]}
        />
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
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
});

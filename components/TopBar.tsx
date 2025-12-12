import React from "react";
import { View, StyleSheet, Image, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext.firebase";
import { Spacing } from "@/constants/theme";
import LoginPrompt from "@/components/LoginPrompt";

export default function TopBar() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation<any>();
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleProfilePress = () => {
    // Navigate to ProfileTab using root navigation
    const rootNavigation = navigation.getParent() || navigation;
    rootNavigation.navigate("ProfileTab");
  };

  const handleSignInPress = () => {
    setShowLoginPrompt(true);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            borderBottomColor: theme.textSecondary + "20",
          },
        ]}
      >
        <View style={styles.leftSection}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.appName}>PodcastGen</ThemedText>
        </View>

        <View style={styles.rightSection}>
          {isAuthenticated && user ? (
            <Pressable
              onPress={handleProfilePress}
              style={({ pressed }) => [
                styles.profileBadge,
                {
                  backgroundColor: theme.primary + "20",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {getInitials(user.fullName)}
                </Text>
              </View>
              <ThemedText
                style={[styles.badgeText, { color: theme.text }]}
                numberOfLines={1}
              >
                {user.fullName || user.email || "User"}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSignInPress}
              style={({ pressed }) => [
                styles.signInButton,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="log-in" size={16} color="#FFFFFF" />
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      <LoginPrompt
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onSuccess={() => setShowLoginPrompt(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
    borderRadius: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    maxWidth: 180,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});


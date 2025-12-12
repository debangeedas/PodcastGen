import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext.firebase";
import { Spacing, BorderRadius } from "@/constants/theme";

interface LoginPromptProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = "options" | "email-signin" | "email-signup";

export default function LoginPrompt({ visible, onClose, onSuccess }: LoginPromptProps) {
  const { theme, isDark } = useTheme();
  const { 
    signInWithApple, 
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    isAppleAuthAvailable,
    isGoogleAuthAvailable,
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setErrorMessage(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuthMode("options");
    resetForm();
    onClose();
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const result = await signInWithApple();
    setIsLoading(false);
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      onSuccess();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(result.error || "Sign in failed.");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const result = await signInWithGoogle();
    setIsLoading(false);
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      onSuccess();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(result.error || "Sign in failed.");
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const result = await signInWithEmail(email.trim(), password);
    setIsLoading(false);
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setAuthMode("options");
      onClose();
      onSuccess();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(result.error || "Sign in failed.");
    }
  };

  const handleEmailSignUp = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const result = await signUpWithEmail(email.trim(), password, fullName.trim());
    setIsLoading(false);
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setAuthMode("options");
      onClose();
      onSuccess();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(result.error || "Sign up failed.");
    }
  };


  const renderAuthOptions = () => (
    <>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="user" size={40} color={theme.primary} />
      </View>

      <ThemedText type="h2" style={styles.title}>
        Sign in to Continue
      </ThemedText>

      <ThemedText
        type="body"
        style={[styles.description, { color: theme.textSecondary }]}
      >
        Create an account to generate podcasts and save your favorites.
      </ThemedText>

      <View style={styles.authOptionsContainer}>
        {Platform.OS === "ios" && isAppleAuthAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={BorderRadius.md}
            style={styles.authButton}
            onPress={handleAppleSignIn}
          />
        ) : null}

        {isGoogleAuthAvailable ? (
          <Pressable
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.backgroundTertiary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.googleIconContainer}>
              <ThemedText style={styles.googleIcon}>G</ThemedText>
            </View>
            <ThemedText type="body" style={{ fontWeight: "600", flex: 1, textAlign: "center" }}>
              Continue with Google
            </ThemedText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAuthMode("email-signin");
          }}
          style={({ pressed }) => [
            styles.socialButton,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.backgroundTertiary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="mail" size={20} color={theme.text} style={styles.buttonIcon} />
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1, textAlign: "center" }}>
            Continue with Email
          </ThemedText>
        </Pressable>
      </View>
    </>
  );

  const renderEmailForm = () => {
    const isSignUp = authMode === "email-signup";
    
    return (
      <>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAuthMode("options");
            resetForm();
          }}
          style={styles.backButton}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={24} color={theme.textSecondary} />
        </Pressable>

        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20", marginTop: Spacing.lg }]}>
          <Feather name="mail" size={40} color={theme.primary} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          {isSignUp ? "Create Account" : "Sign In"}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {isSignUp 
            ? "Enter your details to create an account."
            : "Enter your email and password to sign in."}
        </ThemedText>

        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.secondary + "20" }]}>
            <Feather name="alert-circle" size={16} color={theme.secondary} />
            <ThemedText type="small" style={{ color: theme.secondary, flex: 1, marginLeft: Spacing.sm }}>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.formContainer}>
          {isSignUp ? (
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}>
              <Feather name="user" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          ) : null}

          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}>
            <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}>
            <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Feather 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </Pressable>
          </View>

          <Pressable
            onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {isSignUp ? "Create Account" : "Sign In"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAuthMode(isSignUp ? "email-signin" : "email-signup");
              setErrorMessage(null);
            }}
            style={styles.switchModeButton}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.preventClose} onPress={(e) => e.stopPropagation()}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.container,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.5 : 1 },
                  ]}
                  hitSlop={12}
                >
                  <Feather name="x" size={24} color={theme.textSecondary} />
                </Pressable>

                {authMode === "options" ? renderAuthOptions() : renderEmailForm()}

                {isLoading ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  preventClose: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  backButton: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  authOptionsContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  authButton: {
    width: "100%",
    height: 50,
  },
  socialButton: {
    width: "100%",
    height: 50,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
  },
  buttonIcon: {
    position: "absolute",
    left: Spacing.lg,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: Spacing.lg,
  },
  googleIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  formContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  submitButton: {
    width: "100%",
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  switchModeButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});

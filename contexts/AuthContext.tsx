import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const AUTH_USER_KEY = "@auth_user";
const EMAIL_ACCOUNTS_KEY = "@email_accounts";

export type AuthMethod = "apple" | "google" | "email" | "guest";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  authMethod: AuthMethod;
  photoUrl?: string | null;
}

interface EmailAccount {
  email: string;
  password: string;
  fullName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAppleAuthAvailable: boolean;
  isGoogleAuthAvailable: boolean;
  googleRequest: Google.GoogleAuthRequestConfig | null;
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  const googleClientId = Constants.expoConfig?.extra?.googleClientId || 
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
  
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: googleClientId,
    iosClientId: googleClientId,
    androidClientId: googleClientId,
  });

  const isGoogleAuthAvailable = !!googleClientId && !!googleRequest;

  useEffect(() => {
    loadUser();
    checkAppleAuthAvailability();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleGoogleResponse(googleResponse);
    }
  }, [googleResponse]);

  const checkAppleAuthAvailability = async () => {
    if (Platform.OS === "ios") {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAuthAvailable(available);
    } else {
      setIsAppleAuthAvailable(false);
    }
  };

  const handleGoogleResponse = async (response: ReturnType<typeof Google.useAuthRequest>[1]) => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      try {
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/userinfo/v2/me",
          {
            headers: { Authorization: `Bearer ${response.authentication.accessToken}` },
          }
        );
        const userInfo = await userInfoResponse.json();
        
        const authUser: AuthUser = {
          id: `google_${userInfo.id}`,
          email: userInfo.email || null,
          fullName: userInfo.name || null,
          authMethod: "google",
          photoUrl: userInfo.picture || null,
        };
        
        await saveUser(authUser);
      } catch (error) {
        console.error("Error fetching Google user info:", error);
      }
    }
  };

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      if (!googlePromptAsync) {
        console.error("Google auth not available");
        return false;
      }
      
      const result = await googlePromptAsync();
      return result.type === "success";
    } catch (error) {
      console.error("Google sign-in error:", error);
      return false;
    }
  }, [googlePromptAsync]);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (!parsed.authMethod) {
          parsed.authMethod = "apple";
        }
        setUser(parsed);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (userData: AuthUser) => {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const authUser: AuthUser = {
        id: credential.user,
        email: credential.email,
        fullName: credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(" ") || null
          : null,
        authMethod: "apple",
      };

      await saveUser(authUser);
      return true;
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        return false;
      }
      console.error("Apple sign-in error:", error);
      return false;
    }
  }, []);

  const getEmailAccounts = async (): Promise<EmailAccount[]> => {
    try {
      const data = await AsyncStorage.getItem(EMAIL_ACCOUNTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const saveEmailAccount = async (account: EmailAccount) => {
    const accounts = await getEmailAccounts();
    const existingIndex = accounts.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    await AsyncStorage.setItem(EMAIL_ACCOUNTS_KEY, JSON.stringify(accounts));
  };

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const accounts = await getEmailAccounts();
      const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      
      if (!account) {
        return { success: false, error: "No account found with this email. Please sign up first." };
      }
      
      if (account.password !== password) {
        return { success: false, error: "Incorrect password. Please try again." };
      }
      
      const authUser: AuthUser = {
        id: `email_${email.toLowerCase()}`,
        email: account.email,
        fullName: account.fullName,
        authMethod: "email",
      };
      
      await saveUser(authUser);
      return { success: true };
    } catch (error) {
      console.error("Email sign-in error:", error);
      return { success: false, error: "An error occurred. Please try again." };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!email.includes("@") || !email.includes(".")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      
      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
      }
      
      if (fullName.trim().length < 2) {
        return { success: false, error: "Please enter your full name." };
      }
      
      const accounts = await getEmailAccounts();
      const existingAccount = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      
      if (existingAccount) {
        return { success: false, error: "An account with this email already exists." };
      }
      
      const newAccount: EmailAccount = {
        email: email.toLowerCase(),
        password,
        fullName: fullName.trim(),
      };
      
      await saveEmailAccount(newAccount);
      
      const authUser: AuthUser = {
        id: `email_${email.toLowerCase()}`,
        email: newAccount.email,
        fullName: newAccount.fullName,
        authMethod: "email",
      };
      
      await saveUser(authUser);
      return { success: true };
    } catch (error) {
      console.error("Email sign-up error:", error);
      return { success: false, error: "An error occurred. Please try again." };
    }
  }, []);

  const continueAsGuest = useCallback(async (): Promise<boolean> => {
    try {
      const guestId = `guest_${Date.now()}`;
      const authUser: AuthUser = {
        id: guestId,
        email: null,
        fullName: "Guest User",
        authMethod: "guest",
      };
      
      await saveUser(authUser);
      return true;
    } catch (error) {
      console.error("Guest sign-in error:", error);
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAppleAuthAvailable,
        isGoogleAuthAvailable,
        googleRequest: googleRequest as Google.GoogleAuthRequestConfig | null,
        signInWithApple,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

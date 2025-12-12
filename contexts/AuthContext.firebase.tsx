import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  signInWithCredential,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  OAuthProvider,
  FirebaseError
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, isConfigValid } from '@/config/firebase';
import { setCurrentUserId, loadUserDataFromFirestore } from '@/utils/storage';
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export type AuthMethod = "apple" | "google" | "email";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  authMethod: AuthMethod;
  photoUrl?: string | null;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export interface AuthSuccessResponse {
  success: true;
}

export type AuthResult = AuthSuccessResponse | AuthErrorResponse;

// Email validation regex - RFC 5322 compliant (simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAppleAuthAvailable: boolean;
  isGoogleAuthAvailable: boolean;
  googleRequest: Google.GoogleAuthRequestConfig | null;
  signInWithApple: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
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

  // Debug: Log redirect URI for troubleshooting (remove in production)
  useEffect(() => {
    if (googleRequest && __DEV__) {
      console.log('🔍 Google OAuth Redirect URI:', googleRequest.redirectUri);
      console.log('🔍 Add this exact URI to Google Cloud Console > OAuth Client > Authorized redirect URIs');
    }
  }, [googleRequest]);

  // Listen to Firebase auth state changes (automatic persistence!)
  useEffect(() => {
    // If Firebase is not properly configured, skip auth listener
    if (!isConfigValid) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser) => {
        try {
          if (fbUser) {
            // User is signed in, fetch their data from Firestore
            try {
              const userData = await loadUserData(fbUser.uid);

              if (userData) {
                setFirebaseUser(fbUser);
                setUser(userData);

                // Set current user ID for storage sync
                setCurrentUserId(fbUser.uid);

                // Load user's podcast library from Firestore
                await loadUserDataFromFirestore(fbUser.uid);
              } else {
                // Fallback to Firebase user data if Firestore doc doesn't exist
                const fallbackUser: AuthUser = {
                  id: fbUser.uid,
                  email: fbUser.email,
                  fullName: fbUser.displayName,
                  authMethod: 'email', // Default, will be updated on next login
                  photoUrl: fbUser.photoURL,
                };
                setFirebaseUser(fbUser);
                setUser(fallbackUser);

                // Set current user ID for storage sync
                setCurrentUserId(fbUser.uid);

                // Try to load user data even if auth doc doesn't exist
                await loadUserDataFromFirestore(fbUser.uid);
              }
            } catch (firestoreError) {
              // Even if Firestore fails, still authenticate with Firebase data
              const fallbackUser: AuthUser = {
                id: fbUser.uid,
                email: fbUser.email,
                fullName: fbUser.displayName,
                authMethod: 'email',
                photoUrl: fbUser.photoURL,
              };
              setFirebaseUser(fbUser);
              setUser(fallbackUser);

              // Set current user ID for storage sync
              setCurrentUserId(fbUser.uid);
            }
          } else {
            // User is signed out
            setFirebaseUser(null);
            setUser(null);

            // Clear current user ID
            setCurrentUserId(null);
          }
        } catch (error) {
          // Don't block the app - allow it to continue with no user
          setFirebaseUser(null);
          setUser(null);
        } finally {
          // Always set loading to false, regardless of errors
          setIsLoading(false);
        }
      },
      (error) => {
        // Don't block the app - just mark as not loading
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  // Store promise resolver for Google sign-in
  const googleSignInResolverRef = React.useRef<((result: AuthResult) => void) | null>(null);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleGoogleResponse(googleResponse);
    } else if (googleResponse?.type === "error" || googleResponse?.type === "cancel") {
      // Reject the promise if OAuth was cancelled or errored
      if (googleSignInResolverRef.current) {
        googleSignInResolverRef.current({ 
          success: false, 
          error: googleResponse.type === "cancel" 
            ? "Sign in was cancelled." 
            : "Failed to sign in with Google. Please try again." 
        });
        googleSignInResolverRef.current = null;
      }
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

  // Load user data from Firestore
  const loadUserData = async (uid: string): Promise<AuthUser | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        return userDoc.data() as AuthUser;
      }

      return null;
    } catch (error) {
      // Return null but don't throw - we'll use fallback data
      return null;
    }
  };

  // Save user data to Firestore
  const saveUserData = async (uid: string, userData: Partial<AuthUser>) => {
    try {
      const userRef = doc(db, 'users', uid);

      await setDoc(userRef, {
        ...userData,
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      // Silently fail - user data will be saved on next login
    }
  };

  const handleGoogleResponse = async (response: ReturnType<typeof Google.useAuthRequest>[1]) => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      try {
        // Sign in to Firebase with Google credentials
        const credential = GoogleAuthProvider.credential(
          response.authentication.idToken,
          response.authentication.accessToken
        );

        const result = await signInWithCredential(auth, credential);
        const fbUser = result.user;

        // Save/update user data in Firestore
        const authUser: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email,
          fullName: fbUser.displayName,
          authMethod: "google",
          photoUrl: fbUser.photoURL,
          createdAt: fbUser.metadata.creationTime,
        };

        await saveUserData(fbUser.uid, authUser);

        // Resolve the promise to indicate success
        if (googleSignInResolverRef.current) {
          googleSignInResolverRef.current({ success: true });
          googleSignInResolverRef.current = null;
        }

      } catch (error) {
        // Reject the promise on error
        if (googleSignInResolverRef.current) {
          googleSignInResolverRef.current({ 
            success: false, 
            error: "Failed to sign in with Google. Please try again." 
          });
          googleSignInResolverRef.current = null;
        }
      }
    }
  };

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      if (!googlePromptAsync) {
        return { success: false, error: "Google authentication is not available." };
      }

      // Create a promise that will be resolved by handleGoogleResponse
      const signInPromise = new Promise<AuthResult>((resolve) => {
        googleSignInResolverRef.current = resolve;
      });

      // Trigger the OAuth flow
      const result = await googlePromptAsync();

      if (result.type === "success") {
        // Wait for handleGoogleResponse to complete Firebase sign-in
        return await signInPromise;
      } else if (result.type === "cancel") {
        googleSignInResolverRef.current = null;
        return { success: false, error: "Sign in was cancelled." };
      } else {
        googleSignInResolverRef.current = null;
        return { success: false, error: "Failed to sign in with Google. Please try again." };
      }
    } catch (error) {
      googleSignInResolverRef.current = null;
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  }, [googlePromptAsync]);

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in to Firebase with Apple credentials
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      const result = await signInWithCredential(auth, firebaseCredential);
      const fbUser = result.user;

      const authUser: AuthUser = {
        id: fbUser.uid,
        email: credential.email || fbUser.email,
        fullName: credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(" ") || null
          : fbUser.displayName,
        authMethod: "apple",
      };

      await saveUserData(fbUser.uid, authUser);
      return { success: true };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === "ERR_REQUEST_CANCELED") {
        return { success: false, error: "Sign in was cancelled." };
      }
      return { success: false, error: "Failed to sign in with Apple. Please try again." };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be loaded automatically by onAuthStateChanged
      return { success: true };
    } catch (error: unknown) {
      let errorMessage = "An error occurred. Please try again.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as FirebaseError;
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email. Please sign up first.";
            break;
          case 'auth/wrong-password':
            errorMessage = "Incorrect password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password. Please try again.";
            break;
        }
      }

      return { success: false, error: errorMessage };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string): Promise<AuthResult> => {
    try {
      // Validation
      const trimmedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return { success: false, error: "Please enter a valid email address." };
      }

      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
      }

      const trimmedFullName = fullName.trim();
      if (trimmedFullName.length < 2) {
        return { success: false, error: "Please enter your full name." };
      }

      // Create Firebase user
      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const fbUser = result.user;

      // Save user data to Firestore
      const authUser: AuthUser = {
        id: fbUser.uid,
        email: fbUser.email,
        fullName: trimmedFullName,
        authMethod: "email",
        createdAt: new Date().toISOString(),
      };

      await saveUserData(fbUser.uid, authUser);

      return { success: true };
    } catch (error: unknown) {
      let errorMessage = "An error occurred. Please try again.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as FirebaseError;
        switch (firebaseError.code) {
          case 'auth/email-already-in-use':
            errorMessage = "An account with this email already exists.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use a stronger password.";
            break;
        }
      }

      return { success: false, error: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Sign out from Firebase (this will trigger onAuthStateChanged)
      if (isConfigValid) {
        await firebaseSignOut(auth);
      } else {
        // Firebase not configured, clear local state manually
        setUser(null);
        setFirebaseUser(null);
        setCurrentUserId(null);
      }
    } catch (error) {
      // Even if Firebase sign out fails, clear local state
      setUser(null);
      setFirebaseUser(null);
      setCurrentUserId(null);
      throw error;
    }
  }, [isConfigValid]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        isAppleAuthAvailable,
        isGoogleAuthAvailable,
        googleRequest: googleRequest as Google.GoogleAuthRequestConfig | null,
        signInWithApple,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
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

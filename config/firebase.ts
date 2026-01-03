import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if config is valid
const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isConfigValid) {
  console.warn("Firebase config is incomplete. Some features may not work.");
}

// Initialize Firebase only if it hasn't been initialized yet
let app: FirebaseApp;
try {
  if (!getApps().length) {
    if (isConfigValid) {
      app = initializeApp(firebaseConfig);
    } else {
      // Create a minimal mock app to prevent crashes
      app = {} as FirebaseApp;
    }
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Firebase app initialization error:", error);
  // Don't throw - return a mock app to prevent app crashes
  app = {} as FirebaseApp;
}

// Initialize Firebase Auth with appropriate persistence for platform
let auth: Auth;
try {
  if (isConfigValid) {
    // For web, just use getAuth (it handles persistence automatically)
    // initializeAuth can cause issues with hot reload and Expo web
    auth = getAuth(app);
  } else {
    auth = {} as Auth;
  }
} catch (error: unknown) {
  // If auth is already initialized, just get it
  if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error("Firebase Auth initialization error:", error);
    // Don't throw - create mock auth to prevent crashes
    try {
      auth = getAuth(app);
    } catch (e) {
      console.error("Could not get auth:", e);
      auth = {} as Auth;
    }
  }
}

// Initialize Firestore
let db: Firestore;
try {
  if (isConfigValid) {
    db = getFirestore(app);
  } else {
    db = {} as Firestore;
  }
} catch (error) {
  console.error("Firestore initialization error:", error);
  // Don't throw - create mock db to prevent crashes
  db = {} as Firestore;
}

// Initialize Firebase Storage
let storage: FirebaseStorage;
try {
  if (isConfigValid) {
    storage = getStorage(app);
  } else {
    storage = {} as FirebaseStorage;
  }
} catch (error) {
  console.error("Firebase Storage initialization error:", error);
  // Don't throw - create mock storage to prevent crashes
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage, isConfigValid };

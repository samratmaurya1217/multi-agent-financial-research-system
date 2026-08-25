import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type Auth,
  type UserCredential,
} from "firebase/auth";

// Read Firebase configuration from Vite environment variables
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "";
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
const rawStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "";
const rawMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "";
const rawAppId = import.meta.env.VITE_FIREBASE_APP_ID || "";
const rawMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "";

// Check if valid Firebase configuration is present (not empty, not placeholder)
export function isFirebaseConfigured(): boolean {
  if (!rawApiKey || typeof rawApiKey !== "string") return false;
  if (rawApiKey.includes("your_") || rawApiKey === "AIzaSy..." || rawApiKey.trim().length < 10) return false;
  if (!rawProjectId || rawProjectId.includes("your_") || rawProjectId.trim().length < 3) return false;
  if (!rawAuthDomain || rawAuthDomain.includes("your_")) return false;
  if (!rawAppId || rawAppId.includes("your_")) return false;
  return true;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured()) {
  try {
    const firebaseConfig = {
      apiKey: rawApiKey.trim(),
      authDomain: rawAuthDomain.trim(),
      projectId: rawProjectId.trim(),
      storageBucket: rawStorageBucket ? rawStorageBucket.trim() : undefined,
      messagingSenderId: rawMessagingSenderId ? rawMessagingSenderId.trim() : undefined,
      appId: rawAppId.trim(),
      measurementId: rawMeasurementId ? rawMeasurementId.trim() : undefined,
    };

    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");
    googleProvider.setCustomParameters({ prompt: "select_account" });

    if (import.meta.env.DEV) {
      console.info("[Firebase] Successfully initialized with project:", rawProjectId);
    }
  } catch (err: any) {
    console.warn("[Firebase] Initialization skipped or encountered error:", err?.message || err);
    app = null;
    auth = null;
    googleProvider = null;
  }
} else {
  if (import.meta.env.DEV) {
    console.info("[Firebase] Environment variables not configured or using placeholders. Running in native auth mode.");
  }
}

export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error(
      "Firebase Auth is not configured. Please set the VITE_FIREBASE_* environment variables in your deployment settings."
    );
  }
  return auth;
}

export function getGoogleProviderInstance(): GoogleAuthProvider {
  if (!googleProvider) {
    throw new Error(
      "Firebase Google Auth Provider is not configured. Please set the VITE_FIREBASE_* environment variables in your deployment settings."
    );
  }
  return googleProvider;
}

export {
  app,
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  type FirebaseUser,
  type Auth,
  type UserCredential,
};

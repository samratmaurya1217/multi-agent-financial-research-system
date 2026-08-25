import { apiPost, apiGet } from "./api";
import {
  isFirebaseConfigured,
  getAuthInstance,
  getGoogleProviderInstance,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from "./firebase";

export interface AuthUser {
  user_id: string;
  email: string;
  role: "analyst" | "admin" | "viewer" | "Student" | "Analyst" | "Team" | string;
  created_at?: string;
  id: string;
  name: string;
  avatarInitials: string;
  workspaceId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export function normalizeUser(data: any): AuthUser {
  const user_id = data.user_id || data.id || data.firebaseUid || "usr_01";
  const email = data.email || "user@velsora.ai";
  const name = data.name || data.displayName || email.split("@")[0] || "User";
  const avatarInitials =
    data.avatarInitials ||
    name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "U";

  return {
    ...data,
    user_id,
    email,
    role: data.role || "Analyst",
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    id: user_id,
    name,
    avatarInitials,
    workspaceId: data.workspaceId,
  };
}

export function mapFirebaseAuthError(err: any, fallbackMessage: string): string {
  const code = err?.code || "";
  const msg = err?.message || "";

  switch (code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Firebase API Key is invalid. Please verify your VITE_FIREBASE_* environment variables.";
    case "auth/unauthorized-domain":
      return "This domain (velsora-xfkq.onrender.com) is not in Firebase Authorized Domains. Add it in Firebase Console -> Authentication -> Settings -> Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled in Firebase Console. Enable it in Authentication -> Sign-in method.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was closed before completing.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups for this site.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Access temporarily blocked due to many failed attempts. Please reset your password or try again later.";
    default:
      if (msg.includes("Cannot read properties of undefined (reading 'app')")) {
        return "Firebase is not configured yet. Please use Email and Password or configure Firebase keys in Render.";
      }
      return msg || fallbackMessage;
  }
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  let idToken = "";
  let firebaseUid = "";

  // 1. If Firebase is configured, create the user in Firebase Auth
  if (isFirebaseConfigured()) {
    try {
      const auth = getAuthInstance();
      const cred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
      idToken = await cred.user.getIdToken();
      firebaseUid = cred.user.uid;
    } catch (fbErr: any) {
      // If error is explicit user constraint (e.g. email in use), surface it
      if (
        fbErr.code === "auth/email-already-in-use" ||
        fbErr.code === "auth/weak-password" ||
        fbErr.code === "auth/invalid-email"
      ) {
        throw new Error(mapFirebaseAuthError(fbErr, "Registration failed."));
      }
      console.warn("[Auth] Firebase signup skipped:", fbErr.message);
    }
  }

  // 2. Register & sync with backend database
  const data = await apiPost<any>("/auth/register", {
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password,
    firebaseUid,
    idToken,
  });

  const activeToken = data.token || idToken;
  if (activeToken) {
    localStorage.setItem("velsora_token", activeToken);
  }
  return normalizeUser(data.user || data);
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  let idToken = "";

  // 1. If Firebase is configured, attempt Firebase authentication
  if (isFirebaseConfigured()) {
    try {
      const auth = getAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, payload.email.trim(), payload.password);
      idToken = await cred.user.getIdToken();
    } catch (fbErr: any) {
      // If Firebase rejects password, let backend handle verification
      console.warn("[Auth] Firebase signIn note:", fbErr.code, fbErr.message);
    }
  }

  // 2. Authenticate with backend database
  const data = await apiPost<any>("/auth/login", {
    email: payload.email.trim(),
    password: payload.password,
    idToken,
  });

  const activeToken = data.token || idToken;
  if (activeToken) {
    localStorage.setItem("velsora_token", activeToken);
  }
  return normalizeUser(data.user || data);
}

export async function loginWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Google Sign-In requires Firebase to be configured in Render environment variables. Please use Email and Password or configure Firebase."
    );
  }

  try {
    const auth = getAuthInstance();
    const provider = getGoogleProviderInstance();
    const cred = await signInWithPopup(auth, provider);

    if (!cred.user || !cred.user.email) {
      throw new Error("No email returned from Google authentication.");
    }

    const idToken = await cred.user.getIdToken().catch(() => "");

    const data = await apiPost<any>("/auth/google", {
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email.split("@")[0],
      avatarUrl: cred.user.photoURL || "",
      idToken,
    });

    if (data.token) {
      localStorage.setItem("velsora_token", data.token);
    }
    return normalizeUser(data.user || data);
  } catch (err: any) {
    console.error("Google sign-in error:", err);
    throw new Error(mapFirebaseAuthError(err, "Google Sign-In failed. Please try again."));
  }
}

export async function resetPassword(email: string): Promise<string> {
  if (!email || !email.trim() || !email.includes("@")) {
    throw new Error("Please enter a valid email address to reset your password.");
  }

  if (isFirebaseConfigured()) {
    try {
      const auth = getAuthInstance();
      await sendPasswordResetEmail(auth, email.trim());
      return "Password reset link has been sent to your email address.";
    } catch (err: any) {
      console.warn("Firebase password reset error:", err);
      throw new Error(mapFirebaseAuthError(err, "Could not send password reset email."));
    }
  }

  // Fallback for native auth
  return "If an account exists with this email, password reset instructions have been logged.";
}

export async function logout(): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
    } catch {
      // ignore
    }
  }
  await apiPost("/auth/logout").catch(() => {});
  localStorage.removeItem("velsora_token");
  localStorage.removeItem("velsora_user");
}

export async function getMe(): Promise<AuthUser> {
  const data = await apiGet<any>("/auth/me");
  return normalizeUser(data);
}

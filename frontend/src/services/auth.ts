import { apiPost, apiGet } from "./api";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
} from "./firebase";

export interface AuthUser {
  // Official SAD Section 14.4 properties
  user_id: string;
  email: string;
  role: "analyst" | "admin" | "viewer" | "Student" | "Analyst" | "Team" | string;
  created_at?: string;

  // UI aliases (zero-crash strategy)
  id: string;
  name: string;
  avatarInitials: string;
  workspaceId?: string;
}

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export function normalizeUser(data: any): AuthUser {
  const user_id = data.user_id || data.id || data.firebaseUid || "usr_01";
  const email = data.email || "user@velsora.ai";
  const name = data.name || data.displayName || email.split("@")[0] || "User";
  const avatarInitials =
    data.avatarInitials ||
    name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ||
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

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  let idToken = "";
  let firebaseUid = "";

  // 1. Create account in Firebase Authentication (shows in Firebase Console)
  try {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    idToken = await cred.user.getIdToken();
    firebaseUid = cred.user.uid;
  } catch (fbErr: any) {
    console.warn("Firebase createUser note:", fbErr.code, fbErr.message);
    if (fbErr.code === "auth/email-already-in-use") {
      throw new Error("An account with this email already exists in Firebase. Please sign in instead.");
    }
    if (fbErr.code === "auth/weak-password") {
      throw new Error("Password is too weak. Please use at least 6 characters.");
    }
    if (fbErr.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    // If Firebase service is unavailable or rejected, proceed with backend registration
  }

  // 2. Sync with MongoDB Atlas backend database
  const data = await apiPost<any>("/auth/register", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    firebaseUid,
    idToken,
  });

  const activeToken = idToken || data.token;
  if (activeToken) {
    localStorage.setItem("velsora_token", activeToken);
  }
  return normalizeUser(data.user || data);
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  let idToken = "";

  // 1. Authenticate with Firebase Authentication
  try {
    const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    idToken = await cred.user.getIdToken();
  } catch (fbErr: any) {
    console.warn("Firebase signIn note:", fbErr.code, fbErr.message);
    if (fbErr.code === "auth/wrong-password" || fbErr.code === "auth/invalid-credential") {
      throw new Error("Invalid password or credentials. Please check and try again.");
    }
    if (fbErr.code === "auth/user-not-found") {
      throw new Error("No user found with this email in Firebase. Please create an account.");
    }
    // Fallback to backend authentication if Firebase encounters domain restrictions
  }

  // 2. Sync with MongoDB Atlas backend database
  const data = await apiPost<any>("/auth/login", {
    email: payload.email,
    password: payload.password,
    idToken,
  });

  const activeToken = idToken || data.token;
  if (activeToken) {
    localStorage.setItem("velsora_token", activeToken);
  }
  return normalizeUser(data.user || data);
}

export async function loginWithGoogle(): Promise<AuthUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    if (!cred.user || !cred.user.email) {
      throw new Error("No account email returned from Google Sign-In.");
    }
    const token = await cred.user.getIdToken().catch(() => "");
    const data = await apiPost<any>("/auth/google", {
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email.split("@")[0],
      avatarUrl: cred.user.photoURL || "",
      idToken: token,
    });
    if (data.token) {
      localStorage.setItem("velsora_token", data.token);
    }
    return normalizeUser(data.user || data);
  } catch (err: any) {
    console.error("Google sign-in error:", err);
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      throw new Error("Google sign-in popup was closed before completing.");
    }
    if (err.code === "auth/unauthorized-domain") {
      throw new Error("127.0.0.1 is not in Firebase Authorized Domains. Access via http://localhost:5173 or use Email & Password.");
    }
    if (err.code === "auth/operation-not-allowed" || err.code === "auth/configuration-not-found") {
      throw new Error("Google Sign-In provider is not enabled in Firebase console. Please use Email and Password.");
    }
    if (err.code === "auth/popup-blocked") {
      throw new Error("Sign-in popup was blocked by browser. Please enable popups and try again.");
    }
    throw new Error(err.message || "Google Sign-In failed. Please use your email and password.");
  }
}

export async function logout(): Promise<void> {
  await signOut(auth).catch(() => {});
  await apiPost("/auth/logout").catch(() => {});
  localStorage.removeItem("velsora_token");
  localStorage.removeItem("velsora_user");
}

export async function getMe(): Promise<AuthUser> {
  const data = await apiGet<any>("/auth/me");
  return normalizeUser(data);
}

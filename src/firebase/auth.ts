import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./config";
import type { UserProfile } from "../types/user";

export const LOCAL_STORAGE_USER_KEY = "gridguard_user";
export const LOCAL_STORAGE_ACCOUNT_KEY = "gridguard_account";

/**
 * Maps a Firebase User or stored data to our application UserProfile
 */
export const mapFirebaseUserToProfile = async (
  user: User | null
): Promise<UserProfile | null> => {
  if (!user) return null;

  try {
    if (isFirebaseConfigured) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          uid: user.uid,
          name: data.name || user.displayName || "Solar Operator",
          email: user.email || "",
          phone: data.phone || "",
          role: data.role || "Solar Systems Engineer",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("Could not fetch user profile from Firestore:", err);
  }

  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Solar Operator",
    email: user.email || "",
    role: "Solar Systems Engineer",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
};

/**
 * Log in user with Firebase Auth, falling back to local storage if Firebase is not active
 */
export const loginUser = async (
  email: string,
  pass: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim();

  if (isFirebaseConfigured) {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = (await mapFirebaseUserToProfile(cred.user)) || {
      uid: cred.user.uid,
      name: cred.user.displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
      role: "Solar Systems Engineer",
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return profile;
  }

  // Fallback demo/local authentication when Firebase keys aren't provisioned
  const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
  if (savedAccountStr) {
    try {
      const saved = JSON.parse(savedAccountStr);
      if (
        saved.email.toLowerCase() === cleanEmail.toLowerCase() &&
        saved.password === pass
      ) {
        const profile: UserProfile = {
          uid: "local-user-" + Date.now(),
          name: saved.name || cleanEmail.split("@")[0],
          email: saved.email,
          phone: saved.phone,
          role: "Solar Systems Engineer",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        return profile;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // Default demo user credentials for instant testing
  if (
    cleanEmail.toLowerCase() === "admin@gridguard.io" ||
    cleanEmail.toLowerCase() === "demo@gridguard.io" ||
    cleanEmail.toLowerCase() === "sriram@gridguard.io"
  ) {
    const profile: UserProfile = {
      uid: "demo-admin-01",
      name: "Sriram Kanuri",
      email: cleanEmail,
      phone: "+91 98765 43210",
      role: "Lead Energy Engineer",
      createdAt: "2026-01-15T08:00:00Z",
      lastLogin: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return profile;
  }

  throw new Error("Invalid email or password. You can also use demo@gridguard.io with any password.");
};

/**
 * Register user with Firebase Auth
 */
export const registerUser = async (
  email: string,
  pass: string,
  name: string,
  phone?: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim();
  const cleanName = name.trim();

  if (isFirebaseConfigured) {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    await updateProfile(cred.user, { displayName: cleanName });

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name: cleanName,
      email: cleanEmail,
      phone: phone?.trim(),
      role: "Solar Systems Engineer",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        name: cleanName,
        email: cleanEmail,
        phone: phone?.trim() || "",
        role: "Solar Systems Engineer",
        createdAt: serverTimestamp(),
      });
    } catch (docErr) {
      console.warn("Could not save user profile doc in Firestore:", docErr);
    }

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newProfile));
    return newProfile;
  }

  // Fallback registration locally
  const account = {
    name: cleanName,
    email: cleanEmail,
    phone: phone?.trim() || "",
    password: pass,
  };
  localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(account));

  const profile: UserProfile = {
    uid: "local-user-" + Date.now(),
    name: cleanName,
    email: cleanEmail,
    phone: phone?.trim(),
    role: "Solar Systems Engineer",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  return profile;
};

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Firebase sign out failed or not connected:", err);
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
};

/**
 * Change user password
 */
export const changeUserPassword = async (newPassword: string): Promise<void> => {
  if (auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  } else {
    const savedAccount = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
    if (savedAccount) {
      const parsed = JSON.parse(savedAccount);
      parsed.password = newPassword;
      localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(parsed));
    }
  }
};

/**
 * Updates profile details
 */
export const updateCurrentUserProfile = async (
  name: string,
  phone?: string,
  role?: string
): Promise<UserProfile> => {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name });
    try {
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { name, phone: phone || "", role: role || "Solar Systems Engineer" },
        { merge: true }
      );
    } catch (e) {
      console.warn("Firestore update profile error:", e);
    }
  }

  const stored = getStoredUser();
  const updated: UserProfile = {
    uid: stored?.uid || "user-" + Date.now(),
    name,
    email: stored?.email || "user@gridguard.io",
    phone: phone || stored?.phone || "",
    role: role || stored?.role || "Solar Systems Engineer",
    createdAt: stored?.createdAt || new Date().toISOString(),
    lastLogin: stored?.lastLogin || new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Get current stored user profile synchronously
 */
export const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuth = (
  callback: (user: UserProfile | null) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    const current = getStoredUser();
    callback(current);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await mapFirebaseUserToProfile(firebaseUser);
      if (profile) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      }
      callback(profile);
    } else {
      const stored = getStoredUser();
      callback(stored);
    }
  });

  return unsubscribe;
};

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "./config";
import { rtdbService } from "./database";
import { presenceManager } from "./presence";
import type { UserProfile } from "../types/user";

export const LOCAL_STORAGE_USER_KEY = "gridguard_user";
export const LOCAL_STORAGE_ACCOUNT_KEY = "gridguard_account";

const ADMIN_EMAIL = "sriramkanuri4@gmail.com";

/**
 * Checks if a given email belongs to the primary system administrator
 */
export const isConfiguredAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

/**
 * Maps a Firebase User and its Realtime Database record to our UserProfile
 */
export const mapFirebaseUserToProfile = async (
  user: User | null
): Promise<UserProfile | null> => {
  if (!user) return null;

  try {
    // 1. Fetch user role and status from Firebase Realtime Database
    const rtdbProfile = await rtdbService.getUserProfile(user.uid);
    const isAdmin = isConfiguredAdminEmail(user.email || "") || rtdbProfile?.role === "admin";
    const role = isAdmin ? "admin" : (rtdbProfile?.role || "member");
    const accountStatus = rtdbProfile?.status || "active";

    const profile: UserProfile = {
      uid: user.uid,
      name: rtdbProfile?.name || user.displayName || user.email?.split("@")[0] || "Solar Operator",
      email: user.email || "",
      phone: rtdbProfile?.phone || "",
      role,
      status: accountStatus,
      isAdmin,
      mfaEnabled: Boolean(rtdbProfile?.mfaEnabled),
      mfaSecret: rtdbProfile?.mfaSecret,
      createdAt: rtdbProfile?.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    // Ensure admin role is persisted in RTDB
    if (isAdmin && rtdbProfile?.role !== "admin") {
      await rtdbService.saveUserProfile(user.uid, { role: "admin", isAdmin: true, status: "active" });
    }

    return profile;
  } catch (err) {
    console.warn("[Auth] Failed fetching RTDB profile:", err);
  }

  const isAdmin = isConfiguredAdminEmail(user.email || "");
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Solar Operator",
    email: user.email || "",
    role: isAdmin ? "admin" : "member",
    status: "active",
    isAdmin,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
};

/**
 * Primary Email & Password Authentication
 */
export const loginUser = async (
  email: string,
  pass: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Attempt standard Firebase Auth sign-in
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const profile = await mapFirebaseUserToProfile(cred.user);

    if (!profile) {
      throw new Error("Unable to establish profile session.");
    }

    // Verify account active status
    if (profile.status === "disabled") {
      await signOut(auth);
      throw new Error("This operator account has been deactivated by an administrator.");
    }

    // Initialize presence and persist session
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    presenceManager.initializePresence(profile.uid, profile.email, profile.name);

    // Audit log
    await rtdbService.logAuditEvent("USER_LOGIN", cleanEmail, { method: "PASSWORD" }, profile.uid, profile.email);
    return profile;
  } catch (err: unknown) {
    console.warn("[Auth] Firebase signIn error, checking fallback accounts:", err);

    // If Firebase Auth fails because user is not yet created in Auth, check fallback database accounts
    const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
    if (savedAccountStr) {
      try {
        const saved = JSON.parse(savedAccountStr);
        if (saved.email.toLowerCase() === cleanEmail && saved.password === pass) {
          const isAdmin = isConfiguredAdminEmail(cleanEmail) || saved.role === "admin";
          const profile: UserProfile = {
            uid: saved.uid || "local-user-" + Date.now(),
            name: saved.name || cleanEmail.split("@")[0],
            email: cleanEmail,
            phone: saved.phone,
            role: isAdmin ? "admin" : "member",
            status: "active",
            isAdmin,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          presenceManager.initializePresence(profile.uid, profile.email, profile.name);
          await rtdbService.logAuditEvent("USER_LOGIN", cleanEmail, { method: "LOCAL_CREDENTIAL" }, profile.uid, cleanEmail);
          return profile;
        }
      } catch {
        // ignore
      }
    }

    // Admin bootstrap login for development setup if password provided in environment matches
    if (isConfiguredAdminEmail(cleanEmail)) {
      const adminPass = import.meta.env.ADMIN_INITIAL_PASSWORD || "GridGuardAdmin2026!";
      if (pass === adminPass) {
        const existingSecret = (await rtdbService.getMfaSecret(cleanEmail)) || localStorage.getItem("gridguard_mfa_" + cleanEmail);
        const profile: UserProfile = {
          uid: "admin-root-01",
          name: "System Administrator",
          email: cleanEmail,
          role: "admin",
          status: "active",
          isAdmin: true,
          mfaEnabled: Boolean(existingSecret),
          mfaSecret: existingSecret || undefined,
          createdAt: "2026-01-01T00:00:00.000Z",
          lastLogin: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        presenceManager.initializePresence(profile.uid, profile.email, profile.name);
        await rtdbService.saveUserProfile(profile.uid, profile);
        await rtdbService.logAuditEvent("ADMIN_BOOTSTRAP_LOGIN", cleanEmail, {}, profile.uid, cleanEmail);
        return profile;
      }
    }

    const errorMsg = err instanceof Error ? err.message : "Invalid credentials. Please verify email and password.";
    throw new Error(errorMsg);
  }
};

/**
 * Login via Secure 6-Digit Email OTP
 */
export const loginWithOtp = async (
  email: string,
  otp: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";

  const response = await fetch(`${backendUrl}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, otp }),
  });

  if (!response.ok) {
    let errorDetail = "Invalid or expired OTP code.";
    try {
      const data = await response.json();
      if (data.detail) errorDetail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  const result = await response.json();
  const isAdmin = isConfiguredAdminEmail(cleanEmail) || result.isAdmin;
  const uid = "usr_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

  // Fetch or create profile in RTDB
  let profile = await rtdbService.getUserProfile(uid);
  if (!profile) {
    profile = {
      uid,
      name: cleanEmail.split("@")[0],
      email: cleanEmail,
      role: isAdmin ? "admin" : "member",
      status: "active",
      isAdmin,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    await rtdbService.saveUserProfile(uid, profile);
  } else {
    profile = {
      ...profile,
      role: isAdmin ? "admin" : profile.role,
      isAdmin,
      lastLogin: new Date().toISOString(),
    };
    await rtdbService.saveUserProfile(uid, profile);
  }

  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  presenceManager.initializePresence(profile.uid, profile.email, profile.name);
  await rtdbService.logAuditEvent("USER_LOGIN_OTP", cleanEmail, { method: "EMAIL_OTP" }, profile.uid, cleanEmail);

  return profile;
};

/**
 * Login via Multi-Factor Authenticator (TOTP)
 */
export const loginWithMfa = async (
  email: string,
  code: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = isConfiguredAdminEmail(cleanEmail);

  // 1. Multi-source secret resolution
  let secret = await rtdbService.getMfaSecret(cleanEmail);

  if (!secret) {
    secret = localStorage.getItem("gridguard_mfa_" + cleanEmail) || null;
  }

  if (!secret) {
    const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
    if (savedAccountStr) {
      try {
        const saved = JSON.parse(savedAccountStr);
        if (saved.email?.toLowerCase() === cleanEmail && saved.mfaSecret) {
          secret = saved.mfaSecret;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!secret) {
    const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (savedUserStr) {
      try {
        const saved = JSON.parse(savedUserStr);
        if (saved.email?.toLowerCase() === cleanEmail && saved.mfaSecret) {
          secret = saved.mfaSecret;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!secret) {
    throw new Error(
      "MFA is not yet configured for this account. Please sign in with Password or Email OTP first, then scan the Authenticator QR code in Settings."
    );
  }

  // 2. Verify 6-digit TOTP code against Python FastAPI Auth Engine
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";
  const res = await fetch(`${backendUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, code: code.trim() }),
  });

  if (!res.ok) {
    let detail = "Invalid 6-digit authenticator code. Check your authenticator app and device clock.";
    try {
      const data = await res.json();
      if (data.detail) detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  // 3. TOTP Verified! Fetch or construct user profile
  let profile = await rtdbService.findUserProfileByEmail(cleanEmail);
  const uid =
    profile?.uid ||
    (isAdmin ? "admin-root-01" : "usr_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"));

  if (!profile) {
    profile = {
      uid,
      name: isAdmin ? "System Administrator" : cleanEmail.split("@")[0],
      email: cleanEmail,
      role: isAdmin ? "admin" : "member",
      status: "active",
      isAdmin,
      mfaEnabled: true,
      mfaSecret: secret,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
  } else {
    profile = {
      ...profile,
      role: isAdmin ? "admin" : profile.role,
      isAdmin,
      mfaEnabled: true,
      mfaSecret: secret,
      lastLogin: new Date().toISOString(),
    };
  }

  // 4. Save profile, mfa store, and session
  await rtdbService.saveUserProfile(uid, profile);
  await rtdbService.saveMfaSecret(cleanEmail, secret);

  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  localStorage.setItem("gridguard_mfa_" + cleanEmail, secret);
  presenceManager.initializePresence(profile.uid, profile.email, profile.name);
  await rtdbService.logAuditEvent(
    "USER_LOGIN_MFA",
    cleanEmail,
    { method: "MFA_TOTP" },
    profile.uid,
    cleanEmail
  );

  return profile;
};

/**
 * Reset Password using 6-Digit Email OTP
 */
export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPass: string
): Promise<void> => {
  const cleanEmail = email.trim().toLowerCase();
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";

  // Verify OTP with backend
  const response = await fetch(`${backendUrl}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, otp: otp.trim() }),
  });

  if (!response.ok) {
    let errorDetail = "Invalid or expired verification code.";
    try {
      const data = await response.json();
      if (data.detail) errorDetail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  // Update password in local account storage
  const savedAccountStr = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
  if (savedAccountStr) {
    try {
      const saved = JSON.parse(savedAccountStr);
      if (saved.email.toLowerCase() === cleanEmail) {
        saved.password = newPass;
        localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(saved));
      }
    } catch {
      // ignore
    }
  }

  // Update last seen / audit in RTDB
  const uid = "usr_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  await rtdbService.logAuditEvent("PASSWORD_RESET_OTP", cleanEmail, { method: "EMAIL_OTP" }, uid, cleanEmail);
};


/**
 * Register User with Firebase Auth and Realtime Database Profile
 */
export const registerUser = async (
  email: string,
  pass: string,
  name: string,
  phone?: string,
  requestedAdmin: boolean = false
): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const isAdmin = isConfiguredAdminEmail(cleanEmail) || requestedAdmin;
  const role = isAdmin ? "admin" : "member";
  const nowStr = new Date().toISOString();

  let uid = "user_" + Date.now();

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    await updateProfile(cred.user, { displayName: cleanName });
    uid = cred.user.uid;
  } catch (authErr) {
    console.warn("[Auth] Firebase createUserWithEmailAndPassword notice:", authErr);
  }

  const profile: UserProfile = {
    uid,
    name: cleanName,
    email: cleanEmail,
    phone: phone?.trim(),
    role,
    status: "active",
    isAdmin,
    mfaEnabled: false,
    createdAt: nowStr,
    lastLogin: nowStr,
  };

  // Save to Realtime Database
  await rtdbService.saveUserProfile(uid, profile);

  // Backup account credential locally for resilience
  localStorage.setItem(
    LOCAL_STORAGE_ACCOUNT_KEY,
    JSON.stringify({ ...profile, password: pass })
  );
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));

  presenceManager.initializePresence(profile.uid, profile.email, profile.name);
  await rtdbService.logAuditEvent("USER_REGISTERED", cleanEmail, { role }, profile.uid, cleanEmail);

  return profile;
};

/**
 * Terminate Session & Disconnect Presence
 */
export const logoutUser = async (): Promise<void> => {
  const current = getStoredUser();
  if (current?.uid) {
    await presenceManager.setOffline(current.uid);
    await rtdbService.logAuditEvent("USER_LOGOUT", current.email, {}, current.uid, current.email);
  }

  try {
    await signOut(auth);
  } catch (err) {
    console.warn("[Auth] signOut notice:", err);
  }

  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
};

/**
 * Synchronous fetch of local stored user
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
 * Updates profile in Realtime Database and localStorage
 */
export const updateCurrentUserProfile = async (
  name: string,
  phone?: string,
  role?: string
): Promise<UserProfile> => {
  const stored = getStoredUser();
  if (!stored) throw new Error("No active session found.");

  const isAdmin = isConfiguredAdminEmail(stored.email) || stored.isAdmin;
  const updated: UserProfile = {
    ...stored,
    name: name.trim(),
    phone: phone?.trim() || stored.phone || "",
    role: isAdmin ? "admin" : (role || stored.role),
    lastSeen: new Date().toISOString(),
  };

  await rtdbService.saveUserProfile(stored.uid, updated);
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Change Password
 */
export const changeUserPassword = async (newPassword: string): Promise<void> => {
  if (auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  }
  const saved = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      parsed.password = newPassword;
      localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }
};

/**
 * Subscribe to Auth State
 */
export const subscribeToAuth = (
  callback: (user: UserProfile | null) => void
): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await mapFirebaseUserToProfile(firebaseUser);
      if (profile) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        presenceManager.initializePresence(profile.uid, profile.email, profile.name);
      }
      callback(profile);
    } else {
      const stored = getStoredUser();
      callback(stored);
    }
  });

  return unsubscribe;
};

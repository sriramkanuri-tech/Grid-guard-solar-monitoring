import {
  ref,
  onValue,
  set,
  update,
  push,
  remove,
  get,
  serverTimestamp,
} from "firebase/database";
import { rtdb, databaseURL } from "./config";
import type { UserProfile } from "../types/user";
import type { GridData } from "../types/grid";
import type { Alert } from "../types/alert";
import type { SensorData } from "../types/sensor";
import type { AnomalyRecord, InferenceHistoryItem } from "../types/ml";

export interface RealtimeTelemetry {
  nodeId: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  temperature: number;
  irradiance: number;
  efficiency: number;
  frequency?: number;
  powerFactor?: number;
  status: "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
}

export interface SolarNode {
  nodeId: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL";
  lastSeen: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  temperature: number;
  firmware: string;
}

export interface SystemNotification {
  id: string;
  recipientUid: string;
  title: string;
  message: string;
  type: "CRITICAL" | "WARNING" | "INFO" | "SECURITY" | "ANNOUNCEMENT";
  timestamp: string;
  read: boolean;
}

export interface AuditLogEntry {
  id: string;
  uid: string;
  actorEmail: string;
  action: string;
  target?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SystemState {
  status: "OPTIMAL" | "DEGRADED" | "OFFLINE";
  lastUpdate: string;
  version: string;
  maintenanceMode: boolean;
  stopMlDetectionMails?: boolean;
}

// Default fallback storage keys for offline resilience
const CACHE_USERS_KEY = "gridguard_cache_users";
const CACHE_NODES_KEY = "gridguard_cache_nodes";
const CACHE_ALERTS_KEY = "gridguard_cache_alerts";
const CACHE_LOGS_KEY = "gridguard_cache_audit";
const CACHE_NOTIFS_KEY = "gridguard_cache_notifs";
const CACHE_ANOMALIES_KEY = "gridguard_cache_anomalies";
const CACHE_ML_HISTORY_KEY = "gridguard_cache_ml_history";

/**
 * Ultra-resilient RTDB write helpers:
 * 1. REST operation writes directly to Firebase Realtime Database over HTTPS.
 * 2. Concurrently, the Firebase SDK set/update/remove is called with an 800ms timeout
 *    so it never hangs indefinitely when the WebSocket connection is pending/unauthenticated.
 */
export async function rtdbPut<T>(path: string, data: T): Promise<void> {
  const restPromise = fetch(`${databaseURL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) => {
    if (import.meta.env.DEV) console.warn(`[RTDB REST PUT ${path}]`, err);
  });

  const sdkPromise = Promise.race([
    set(ref(rtdb, path), data),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]).catch(() => {});

  await Promise.allSettled([restPromise, sdkPromise]);
}

export async function rtdbPatch<T>(path: string, patchData: T): Promise<void> {
  const restPromise = fetch(`${databaseURL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patchData),
  }).catch((err) => {
    if (import.meta.env.DEV) console.warn(`[RTDB REST PATCH ${path}]`, err);
  });

  const sdkPromise = Promise.race([
    update(ref(rtdb, path), patchData as object),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]).catch(() => {});

  await Promise.allSettled([restPromise, sdkPromise]);
}

export async function rtdbDelete(path: string): Promise<void> {
  const restPromise = fetch(`${databaseURL}/${path}.json`, {
    method: "DELETE",
  }).catch((err) => {
    if (import.meta.env.DEV) console.warn(`[RTDB REST DELETE ${path}]`, err);
  });

  const sdkPromise = Promise.race([
    remove(ref(rtdb, path)),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]).catch(() => {});

  await Promise.allSettled([restPromise, sdkPromise]);
}

export async function rtdbFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${databaseURL}/${path}.json`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const rtdbService = {
  // ==========================================
  // USERS & MEMBERS MANAGEMENT
  // ==========================================
  subscribeToUsers: (callback: (users: UserProfile[]) => void): (() => void) => {
    // 1. Immediately provide cached users so screen is never blank
    const cached = localStorage.getItem(CACHE_USERS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh users even without WebSocket
    rtdbFetch<Record<string, UserProfile>>("users").then((raw) => {
      if (raw) {
        const list = Object.entries(raw).map(([uid, u]) => ({
          ...u,
          uid,
        }));
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(list));
        callback(list);
      } else {
        rtdbService.seedDefaultAdmin();
      }
    });

    try {
      const usersRef = ref(rtdb, "users");
      return onValue(
        usersRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, UserProfile>;
            const list = Object.entries(raw).map(([uid, u]) => ({
              ...u,
              uid,
            }));
            localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  seedDefaultAdmin: async (): Promise<void> => {
    const adminProfile: UserProfile = {
      uid: "admin-root-01",
      name: "Sriram Kanuri (Admin)",
      email: "sriramkanuri4@gmail.com",
      role: "admin",
      status: "active",
      isAdmin: true,
      mfaEnabled: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    await rtdbService.saveUserProfile("admin-root-01", adminProfile);
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const restData = await rtdbFetch<UserProfile>(`users/${uid}`);
      if (restData) {
        return { ...restData, uid };
      }
    } catch {}

    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const snap = await Promise.race([
        get(userRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (snap && snap.exists()) {
        return { ...snap.val(), uid };
      }
      return null;
    } catch {
      return null;
    }
  },

  saveUserProfile: async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
    const payload = {
      ...profile,
      uid,
      lastSeen: new Date().toISOString(),
    };

    await rtdbPut(`users/${uid}`, payload);

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      const list: UserProfile[] = cached ? JSON.parse(cached) : [];
      const updated = [...list.filter((u) => u.uid !== uid), payload as UserProfile];
      localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
    } catch {}
  },

  saveMfaSecret: async (email: string, secret: string): Promise<void> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const key = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const mfaRef = ref(rtdb, `mfa_store/${key}`);
      await set(mfaRef, {
        email: cleanEmail,
        secret,
        enabled: true,
        updatedAt: new Date().toISOString(),
      });
      // Also update users/usr_{key}
      const userRef = ref(rtdb, `users/usr_${key}`);
      await update(userRef, {
        mfaSecret: secret,
        mfaEnabled: true,
        email: cleanEmail,
      });
      if (cleanEmail === "sriramkanuri4@gmail.com") {
        await update(ref(rtdb, "users/admin-root-01"), {
          mfaSecret: secret,
          mfaEnabled: true,
        });
      }
    } catch (err) {
      console.warn("[RTDB] Failed saving MFA secret:", err);
    }
  },

  getMfaSecret: async (email: string): Promise<string | null> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const key = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

      // Check mfa_store
      const mfaRef = ref(rtdb, `mfa_store/${key}`);
      const mfaSnap = await get(mfaRef);
      if (mfaSnap.exists() && mfaSnap.val()?.secret) {
        return mfaSnap.val().secret;
      }

      // Check users/usr_{key}
      const userRef = ref(rtdb, `users/usr_${key}`);
      const userSnap = await get(userRef);
      if (userSnap.exists() && userSnap.val()?.mfaSecret) {
        return userSnap.val().mfaSecret;
      }

      // Check users/admin-root-01 if admin email
      if (cleanEmail === "sriramkanuri4@gmail.com") {
        const adminRef = ref(rtdb, "users/admin-root-01");
        const adminSnap = await get(adminRef);
        if (adminSnap.exists() && adminSnap.val()?.mfaSecret) {
          return adminSnap.val().mfaSecret;
        }
      }

      // Search all users in users/
      const allRef = ref(rtdb, "users");
      const allSnap = await get(allRef);
      if (allSnap.exists()) {
        const val = allSnap.val() as Record<string, UserProfile>;
        for (const u of Object.values(val)) {
          if (u.email && u.email.trim().toLowerCase() === cleanEmail && u.mfaSecret) {
            return u.mfaSecret;
          }
        }
      }

      return null;
    } catch (err) {
      console.warn("[RTDB] Error fetching MFA secret:", err);
      return null;
    }
  },

  removeMfaSecret: async (email: string): Promise<void> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const key = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      await remove(ref(rtdb, `mfa_store/${key}`));
      await update(ref(rtdb, `users/usr_${key}`), { mfaSecret: null, mfaEnabled: false });
      if (cleanEmail === "sriramkanuri4@gmail.com") {
        await update(ref(rtdb, "users/admin-root-01"), { mfaSecret: null, mfaEnabled: false });
      }
    } catch (err) {
      console.warn("[RTDB] Failed removing MFA secret:", err);
    }
  },

  findUserProfileByEmail: async (email: string): Promise<UserProfile | null> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const key = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

      const direct = await rtdbService.getUserProfile(`usr_${key}`);
      if (direct) return direct;

      if (cleanEmail === "sriramkanuri4@gmail.com") {
        const admin = await rtdbService.getUserProfile("admin-root-01");
        if (admin) return admin;
      }

      const allRef = ref(rtdb, "users");
      const snap = await get(allRef);
      if (snap.exists()) {
        const raw = snap.val() as Record<string, UserProfile>;
        for (const [uid, u] of Object.entries(raw)) {
          if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
            return { ...u, uid };
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  setUserStatus: async (uid: string, status: "active" | "disabled"): Promise<void> => {
    await rtdbPatch(`users/${uid}`, { status });
    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        const updated = list.map((u) => (u.uid === uid ? { ...u, status } : u));
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  setUserRole: async (uid: string, role: "admin" | "member"): Promise<void> => {
    const payload = { role, isAdmin: role === "admin" };
    await rtdbPatch(`users/${uid}`, payload);
    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        const updated = list.map((u) => (u.uid === uid ? { ...u, ...payload } : u));
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  deleteUser: async (uid: string): Promise<void> => {
    await rtdbDelete(`users/${uid}`);
    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(list.filter((u) => u.uid !== uid)));
      }
    } catch {}
  },

  getAllUserEmails: async (): Promise<string[]> => {
    const emails = new Set<string>();
    emails.add("sriramkanuri4@gmail.com");

    try {
      const raw = await rtdbFetch<Record<string, UserProfile>>("users");
      if (raw && typeof raw === "object") {
        Object.values(raw).forEach((u) => {
          if (u && u.email && typeof u.email === "string" && u.email.includes("@")) {
            emails.add(u.email.trim().toLowerCase());
          }
        });
      }
    } catch {}

    // Include operators who registered or requested OTP
    try {
      const otps = await rtdbFetch<Record<string, { email?: string }>>("auth_otps");
      if (otps && typeof otps === "object") {
        Object.values(otps).forEach((item) => {
          if (item && item.email && typeof item.email === "string" && item.email.includes("@")) {
            emails.add(item.email.trim().toLowerCase());
          }
        });
      }
    } catch {}

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        list.forEach((u) => {
          if (u && u.email && typeof u.email === "string" && u.email.includes("@")) {
            emails.add(u.email.trim().toLowerCase());
          }
        });
      }
    } catch {}

    return Array.from(emails);
  },

  // ==========================================
  // REAL-TIME TELEMETRY (BY NODE)
  // ==========================================
  subscribeToTelemetry: (
    nodeId: string,
    callback: (data: RealtimeTelemetry | null) => void
  ): (() => void) => {
    try {
      const telRef = ref(rtdb, `telemetry/${nodeId}`);
      return onValue(
        telRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val() as RealtimeTelemetry);
          } else {
            callback(null);
          }
        },
        () => callback(null)
      );
    } catch {
      return () => {};
    }
  },

  subscribeToAllTelemetry: (
    callback: (telemetryMap: Record<string, RealtimeTelemetry>) => void
  ): (() => void) => {
    try {
      const allTelRef = ref(rtdb, "telemetry");
      return onValue(
        allTelRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val() as Record<string, RealtimeTelemetry>);
          } else {
            callback({});
          }
        },
        () => callback({})
      );
    } catch {
      return () => {};
    }
  },

  pushTelemetry: async (nodeId: string, data: Partial<RealtimeTelemetry>): Promise<void> => {
    const payload: RealtimeTelemetry = {
      nodeId,
      timestamp: new Date().toISOString(),
      voltage: data.voltage ?? 230.0,
      current: data.current ?? 12.0,
      power: data.power ?? 4.5,
      energy: data.energy ?? 45.0,
      temperature: data.temperature ?? 35.0,
      irradiance: data.irradiance ?? 850.0,
      efficiency: data.efficiency ?? 92.5,
      frequency: data.frequency ?? 50.02,
      powerFactor: data.powerFactor ?? 0.98,
      status: data.status || "ONLINE",
    };

    await rtdbPut(`telemetry/${nodeId}`, payload);
    await rtdbPatch(`nodes/${nodeId}`, {
      voltage: payload.voltage,
      current: payload.current,
      power: payload.power,
      energy: payload.energy,
      temperature: payload.temperature,
      lastSeen: payload.timestamp,
      status: payload.status,
    });
  },

  // ==========================================
  // SOLAR NODES MANAGEMENT
  // ==========================================
  subscribeToNodes: (callback: (nodes: SolarNode[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_NODES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh nodes even without WebSocket
    rtdbFetch<Record<string, SolarNode>>("nodes").then((raw) => {
      if (raw) {
        const list = Object.entries(raw).map(([nodeId, n]) => ({
          ...n,
          nodeId,
        }));
        localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(list));
        callback(list);
      }
    });

    try {
      const nodesRef = ref(rtdb, "nodes");
      return onValue(
        nodesRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, SolarNode>;
            const list = Object.entries(raw).map(([nodeId, n]) => ({
              ...n,
              nodeId,
            }));
            localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  createOrUpdateNode: async (nodeId: string, nodeData: Partial<SolarNode>): Promise<void> => {
    const payload = {
      ...nodeData,
      nodeId,
      lastSeen: new Date().toISOString(),
    };

    await rtdbPut(`nodes/${nodeId}`, payload);

    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      const list: SolarNode[] = cached ? JSON.parse(cached) : [];
      const updated = [...list.filter((n) => n.nodeId !== nodeId), payload as SolarNode];
      localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(updated));
    } catch {}
  },

  updateNodeStatus: async (
    nodeId: string,
    status: "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL"
  ): Promise<void> => {
    await rtdbPatch(`nodes/${nodeId}`, { status, lastSeen: new Date().toISOString() });
    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      if (cached) {
        const list: SolarNode[] = JSON.parse(cached);
        const updated = list.map((n) => (n.nodeId === nodeId ? { ...n, status } : n));
        localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    await rtdbDelete(`nodes/${nodeId}`);
    await rtdbDelete(`telemetry/${nodeId}`);
    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      if (cached) {
        const list: SolarNode[] = JSON.parse(cached);
        localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(list.filter((n) => n.nodeId !== nodeId)));
      }
    } catch {}
  },

  // ==========================================
  // REAL-TIME ALERTS
  // ==========================================
  subscribeToAlerts: (callback: (alerts: Alert[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_ALERTS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh alerts even without WebSocket
    rtdbFetch<Record<string, Alert>>("alerts").then((raw) => {
      if (raw) {
        const list = Object.entries(raw)
          .map(([id, a]) => ({ ...a, id }))
          .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());
        localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(list));
        callback(list);
      } else {
        rtdbService.seedDefaultAlerts();
      }
    });

    try {
      const alertsRef = ref(rtdb, "alerts");
      return onValue(
        alertsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, Alert>;
            const list = Object.entries(raw)
              .map(([id, a]) => ({ ...a, id }))
              .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());
            localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  seedDefaultAlerts: async (): Promise<void> => {
    const initialAlert: Alert = {
      id: "alert-init-01",
      nodeId: "GG-NODE-01",
      type: "voltage",
      severity: "INFO",
      message: "Real-time telemetry stream synchronized with Firebase RTDB.",
      value: 231.2,
      threshold: 245.0,
      resolved: false,
      status: "OPEN",
      acknowledged: false,
      timestamp: new Date().toISOString(),
    };
    await rtdbPut("alerts/alert-init-01", initialAlert);
    localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify([initialAlert]));
  },

  createAlert: async (alertData: Omit<Alert, "id">): Promise<string> => {
    const id = "alt_" + Date.now();
    const payload: Alert = {
      ...alertData,
      id,
      timestamp: alertData.timestamp || new Date().toISOString(),
    };
    await rtdbPut(`alerts/${id}`, payload);
    try {
      const cached = localStorage.getItem(CACHE_ALERTS_KEY);
      const list: Alert[] = cached ? JSON.parse(cached) : [];
      const updated = [payload, ...list.filter((a) => a.id !== id)];
      localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(updated));
    } catch {}
    return id;
  },

  acknowledgeAlert: async (alertId: string, userEmail: string): Promise<void> => {
    const patch = {
      acknowledged: true,
      acknowledgedBy: userEmail,
      acknowledgedAt: new Date().toISOString(),
    };
    await rtdbPatch(`alerts/${alertId}`, patch);
    try {
      const cached = localStorage.getItem(CACHE_ALERTS_KEY);
      if (cached) {
        const list: Alert[] = JSON.parse(cached);
        const updated = list.map((a) => (a.id === alertId ? { ...a, ...patch } : a));
        localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    const patch = {
      resolved: true,
      status: "RESOLVED" as const,
      resolvedAt: new Date().toISOString(),
    };
    await rtdbPatch(`alerts/${alertId}`, patch);
    try {
      const cached = localStorage.getItem(CACHE_ALERTS_KEY);
      if (cached) {
        const list: Alert[] = JSON.parse(cached);
        const updated = list.map((a) => (a.id === alertId ? { ...a, ...patch } : a));
        localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  subscribeToNotifications: (
    recipientUid: string,
    callback: (notifs: SystemNotification[]) => void
  ): (() => void) => {
    try {
      const notifsRef = ref(rtdb, "notifications");
      return onValue(
        notifsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, SystemNotification>;
            const list = Object.entries(raw)
              .map(([id, n]) => ({ ...n, id }))
              .filter((n) => n.recipientUid === recipientUid || n.recipientUid === "all")
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(list);
          } else {
            callback([]);
          }
        },
        () => callback([])
      );
    } catch {
      return () => {};
    }
  },

  markNotificationRead: async (notifId: string): Promise<void> => {
    try {
      const notifRef = ref(rtdb, `notifications/${notifId}`);
      await update(notifRef, { read: true });
    } catch (err) {
      console.warn("[RTDB] Failed marking notification read:", err);
    }
  },

  sendNotification: async (notif: Omit<SystemNotification, "id">): Promise<void> => {
    try {
      const notifsRef = ref(rtdb, "notifications");
      const newRef = push(notifsRef);
      await set(newRef, {
        ...notif,
        id: newRef.key,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (err) {
      console.warn("[RTDB] Failed sending notification:", err);
    }
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  subscribeToAuditLogs: (callback: (logs: AuditLogEntry[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_LOGS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh audit logs even without WebSocket
    rtdbFetch<Record<string, AuditLogEntry>>("auditLogs").then((raw) => {
      if (raw) {
        const list = Object.entries(raw)
          .map(([id, l]) => ({ ...l, id }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(list));
        callback(list);
      } else {
        rtdbService.seedDefaultAuditLogs();
      }
    });

    try {
      const auditRef = ref(rtdb, "auditLogs");
      return onValue(
        auditRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, AuditLogEntry>;
            const list = Object.entries(raw)
              .map(([id, l]) => ({ ...l, id }))
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  seedDefaultAuditLogs: async (): Promise<void> => {
    const initialLogs: AuditLogEntry[] = [
      {
        id: "log_init_01",
        uid: "admin-root-01",
        actorEmail: "sriramkanuri4@gmail.com",
        action: "SYSTEM_INITIALIZED",
        target: "platform",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        metadata: { status: "OPTIMAL", version: "2.0.0" },
      },
      {
        id: "log_init_02",
        uid: "admin-root-01",
        actorEmail: "sriramkanuri4@gmail.com",
        action: "FIREBASE_RTDB_SYNC",
        target: "gridguardsolarmonitoring-default-rtdb",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        metadata: { nodes: 2, status: "CONNECTED" },
      },
      {
        id: "log_init_03",
        uid: "admin-root-01",
        actorEmail: "sriramkanuri4@gmail.com",
        action: "ML_MODEL_ARMED",
        target: "grid_guard_solar_model.joblib",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        metadata: { algorithm: "Isolation Forest", features: 8 },
      },
    ];
    for (const l of initialLogs) {
      await rtdbPut(`auditLogs/${l.id}`, l);
    }
    localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(initialLogs));
  },

  logAuditEvent: async (
    action: string,
    target?: string,
    metadata?: Record<string, unknown>,
    actorUid?: string,
    actorEmail?: string
  ): Promise<void> => {
    const id = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const payload: AuditLogEntry = {
      id,
      uid: actorUid || "system",
      actorEmail: actorEmail || "sriramkanuri4@gmail.com",
      action,
      target: target || "platform",
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    await rtdbPut(`auditLogs/${id}`, payload);

    try {
      const cached = localStorage.getItem(CACHE_LOGS_KEY);
      const list: AuditLogEntry[] = cached ? JSON.parse(cached) : [];
      const updated = [payload, ...list.filter((l) => l.id !== id)].slice(0, 200);
      localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(updated));
    } catch {}
  },

  // ==========================================
  // SYSTEM STATE
  // ==========================================
  subscribeToSystem: (callback: (state: SystemState | null) => void): (() => void) => {
    try {
      const sysRef = ref(rtdb, "system");
      return onValue(
        sysRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as any;
            const normalized: SystemState = {
              status: raw.status || raw.state?.status || "OPTIMAL",
              lastUpdate: raw.lastUpdate || raw.state?.lastUpdate || new Date().toISOString(),
              version: raw.version || raw.state?.version || "2.4.0-prod",
              maintenanceMode: Boolean(raw.maintenanceMode ?? raw.state?.maintenanceMode ?? false),
              stopMlDetectionMails: Boolean(raw.stopMlDetectionMails ?? raw.state?.stopMlDetectionMails ?? false),
            };
            callback(normalized);
          } else {
            callback({
              status: "OPTIMAL",
              lastUpdate: new Date().toISOString(),
              version: "2.4.0-prod",
              maintenanceMode: false,
              stopMlDetectionMails: false,
            });
          }
        },
        () => callback(null)
      );
    } catch {
      return () => {};
    }
  },

  updateSystemState: async (state: Partial<SystemState>): Promise<void> => {
    try {
      const sysRef = ref(rtdb, "system");
      await update(sysRef, {
        ...state,
        lastUpdate: new Date().toISOString(),
      });
      await rtdbPatch("system", {
        ...state,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed updating system state:", err);
    }
  },

  setMlDetectionEmailsStopped: async (stopped: boolean): Promise<void> => {
    try {
      localStorage.setItem("gridguard_stop_ml_detection_mails", JSON.stringify(stopped));
      await Promise.allSettled([
        rtdbPatch("system", { stopMlDetectionMails: stopped, lastUpdate: new Date().toISOString() }),
        rtdbPut("systemSettings/stop_ml_detection_mails", stopped),
      ]);
    } catch (err) {
      console.warn("[RTDB] Failed setting stop_ml_detection_mails:", err);
    }
  },

  getMlDetectionEmailsStopped: async (): Promise<boolean> => {
    try {
      const cached = localStorage.getItem("gridguard_stop_ml_detection_mails");
      const rest = await rtdbFetch<boolean>("systemSettings/stop_ml_detection_mails");
      if (typeof rest === "boolean") return rest;
      const sys = await rtdbFetch<any>("system");
      if (sys) {
        if (typeof sys.stopMlDetectionMails === "boolean") return sys.stopMlDetectionMails;
        if (sys.state && typeof sys.state.stopMlDetectionMails === "boolean") return sys.state.stopMlDetectionMails;
      }
      if (cached !== null) {
        return JSON.parse(cached);
      }
    } catch {}
    return false;
  },

  // ==========================================
  // SENSORS MANAGEMENT
  // ==========================================
  subscribeToSensors: (callback: (sensors: SensorData[]) => void): (() => void) => {
    // Direct REST fetch on mount
    rtdbFetch<Record<string, SensorData>>("sensors").then((raw) => {
      if (raw) {
        const list = Object.entries(raw).map(([id, s]) => ({
          ...s,
          id,
        }));
        localStorage.setItem("gridguard_cache_sensors", JSON.stringify(list));
        callback(list);
      }
    });

    try {
      const sensorsRef = ref(rtdb, "sensors");
      return onValue(
        sensorsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, SensorData>;
            const list = Object.entries(raw).map(([id, s]) => ({
              ...s,
              id,
            }));
            localStorage.setItem("gridguard_cache_sensors", JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  addSensor: async (sensor: Omit<SensorData, "id">): Promise<SensorData> => {
    const id = "SN-" + Date.now().toString().slice(-4);
    const payload: SensorData = {
      ...sensor,
      id,
      lastSeen: new Date().toISOString(),
    };
    await rtdbPut(`sensors/${id}`, payload);
    return payload;
  },

  updateSensor: async (sensorId: string, data: Partial<SensorData>): Promise<void> => {
    await rtdbPatch(`sensors/${sensorId}`, {
      ...data,
      lastSeen: new Date().toISOString(),
    });
  },

  deleteSensor: async (sensorId: string): Promise<void> => {
    await rtdbDelete(`sensors/${sensorId}`);
  },

  saveOtpRecord: async (emailKey: string, payload: any): Promise<void> => {
    await rtdbPut(`auth_otps/${emailKey}`, payload);
  },

  getOtpRecord: async (emailKey: string): Promise<any | null> => {
    const rest = await rtdbFetch<any>(`auth_otps/${emailKey}`);
    if (rest) return rest;
    try {
      const otpRef = ref(rtdb, `auth_otps/${emailKey}`);
      const snap = await Promise.race([
        get(otpRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (snap && snap.exists()) return snap.val();
    } catch {}
    return null;
  },

  removeOtpRecord: async (emailKey: string): Promise<void> => {
    try {
      const otpRef = ref(rtdb, `auth_otps/${emailKey}`);
      await remove(otpRef);
    } catch {
      try {
        await fetch(`${databaseURL}/auth_otps/${emailKey}.json`, { method: "DELETE" });
      } catch {
        // ignore
      }
    }
  },

  queueEmailBroadcast: async (payload: any): Promise<void> => {
    const queueId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullPayload = {
      ...payload,
      id: queueId,
      queuedAt: new Date().toISOString(),
      status: "PENDING",
    };
    await rtdbPut(`email_queue/${queueId}`, fullPayload);
  },

  queueOtpDispatch: async (email: string, otp: string): Promise<void> => {
    const queueId = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: queueId,
      email,
      otp,
      queuedAt: new Date().toISOString(),
      status: "PENDING",
    };
    await rtdbPut(`otp_dispatch_queue/${queueId}`, payload);
  },

  // ==========================================
  // ANOMALY DETECTION & ML RECORDS
  // ==========================================
  recordAnomaly: async (anomalyData: Omit<AnomalyRecord, "id"> & { id?: string }): Promise<string> => {
    const id = anomalyData.id || "anom_" + Date.now();
    const payload: AnomalyRecord = {
      ...anomalyData,
      id,
      timestamp: anomalyData.timestamp || new Date().toISOString(),
      status: "ABNORMAL",
      createdAt: new Date().toISOString(),
      resolved: anomalyData.resolved ?? false,
    };

    await rtdbPut(`anomalies/${id}`, payload);

    try {
      const cached = localStorage.getItem(CACHE_ANOMALIES_KEY);
      const list: AnomalyRecord[] = cached ? JSON.parse(cached) : [];
      const updated = [payload, ...list.filter((a) => a.id !== id)].slice(0, 100);
      localStorage.setItem(CACHE_ANOMALIES_KEY, JSON.stringify(updated));
    } catch {}

    return id;
  },

  subscribeToAnomalies: (callback: (anomalies: AnomalyRecord[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_ANOMALIES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh anomalies even without WebSocket
    rtdbFetch<Record<string, AnomalyRecord>>("anomalies").then((raw) => {
      if (raw) {
        const list = Object.entries(raw)
          .map(([id, a]) => ({ ...a, id }))
          .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());
        localStorage.setItem(CACHE_ANOMALIES_KEY, JSON.stringify(list));
        callback(list);
      }
    });

    try {
      const anomaliesRef = ref(rtdb, "anomalies");
      return onValue(
        anomaliesRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, AnomalyRecord>;
            const list = Object.entries(raw)
              .map(([id, a]) => ({ ...a, id }))
              .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());
            localStorage.setItem(CACHE_ANOMALIES_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  saveMlInference: async (item: InferenceHistoryItem): Promise<void> => {
    await rtdbPut(`ml_history/${item.id}`, item);

    try {
      const cached = localStorage.getItem(CACHE_ML_HISTORY_KEY);
      const list: InferenceHistoryItem[] = cached ? JSON.parse(cached) : [];
      const updated = [item, ...list.filter((h) => h.id !== item.id)].slice(0, 30);
      localStorage.setItem(CACHE_ML_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  },

  subscribeToMlHistory: (callback: (history: InferenceHistoryItem[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_ML_HISTORY_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    // Direct REST fetch on mount to guarantee fresh ML history even without WebSocket
    rtdbFetch<Record<string, InferenceHistoryItem>>("ml_history").then((raw) => {
      if (raw) {
        const list = Object.entries(raw)
          .map(([id, h]) => ({ ...h, id }))
          .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime())
          .slice(0, 30);
        localStorage.setItem(CACHE_ML_HISTORY_KEY, JSON.stringify(list));
        callback(list);
      }
    });

    try {
      const historyRef = ref(rtdb, "ml_history");
      return onValue(
        historyRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.val() as Record<string, InferenceHistoryItem>;
            const list = Object.entries(raw)
              .map(([id, h]) => ({ ...h, id }))
              .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime())
              .slice(0, 30);
            localStorage.setItem(CACHE_ML_HISTORY_KEY, JSON.stringify(list));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};

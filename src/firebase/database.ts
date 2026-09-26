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
}

// Default fallback storage keys for offline resilience
const CACHE_USERS_KEY = "gridguard_cache_users";
const CACHE_NODES_KEY = "gridguard_cache_nodes";
const CACHE_ALERTS_KEY = "gridguard_cache_alerts";
const CACHE_LOGS_KEY = "gridguard_cache_audit";
const CACHE_NOTIFS_KEY = "gridguard_cache_notifs";

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
          } else {
            // Seed default admin if empty
            rtdbService.seedDefaultAdmin();
            const fallback = localStorage.getItem(CACHE_USERS_KEY);
            callback(fallback ? JSON.parse(fallback) : []);
          }
        },
        () => {
          const fallback = localStorage.getItem(CACHE_USERS_KEY);
          callback(fallback ? JSON.parse(fallback) : []);
        }
      );
    } catch {
      const fallback = localStorage.getItem(CACHE_USERS_KEY);
      callback(fallback ? JSON.parse(fallback) : []);
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
      const userRef = ref(rtdb, `users/${uid}`);
      const snap = await get(userRef);
      if (snap.exists()) {
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

    // 1. SDK Set
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await set(userRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed saving user profile via SDK:", err);
    }

    // 2. Direct REST Fallback
    try {
      await fetch(`${databaseURL}/users/${uid}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}

    // 3. LocalStorage Cache
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
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await update(userRef, { status });
    } catch (err) {
      console.warn("[RTDB] Failed setting user status via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/users/${uid}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {}
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
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await update(userRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed setting user role via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/users/${uid}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
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
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await remove(userRef);
    } catch (err) {
      console.warn("[RTDB] Failed deleting user via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/users/${uid}.json`, { method: "DELETE" });
    } catch {}
    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(list.filter((u) => u.uid !== uid)));
      }
    } catch {}
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

    try {
      const telRef = ref(rtdb, `telemetry/${nodeId}`);
      await set(telRef, payload);

      // Also update nodes summary
      const nodeSummaryRef = ref(rtdb, `nodes/${nodeId}`);
      await update(nodeSummaryRef, {
        voltage: payload.voltage,
        current: payload.current,
        power: payload.power,
        energy: payload.energy,
        temperature: payload.temperature,
        lastSeen: payload.timestamp,
        status: payload.status,
      });
    } catch {
      // Direct REST fallback in case SDK socket has authorization backoff
      try {
        await fetch(`${databaseURL}/telemetry/${nodeId}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // silent
      }
    }
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
          } else {
            const fallback = localStorage.getItem(CACHE_NODES_KEY);
            callback(fallback ? JSON.parse(fallback) : []);
          }
        },
        () => {
          const cached = localStorage.getItem(CACHE_NODES_KEY);
          callback(cached ? JSON.parse(cached) : []);
        }
      );
    } catch {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      callback(cached ? JSON.parse(cached) : []);
      return () => {};
    }
  },

  createOrUpdateNode: async (nodeId: string, nodeData: Partial<SolarNode>): Promise<void> => {
    const payload = {
      ...nodeData,
      nodeId,
      lastSeen: new Date().toISOString(),
    };
    try {
      const nodeRef = ref(rtdb, `nodes/${nodeId}`);
      await set(nodeRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed creating/updating node via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/nodes/${nodeId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      const list: SolarNode[] = cached ? JSON.parse(cached) : [];
      const updated = [...list.filter((n) => n.nodeId !== nodeId), payload as SolarNode];
      localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(updated));
    } catch {}
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    try {
      const nodeRef = ref(rtdb, `nodes/${nodeId}`);
      await remove(nodeRef);
      const telRef = ref(rtdb, `telemetry/${nodeId}`);
      await remove(telRef);
    } catch (err) {
      console.warn("[RTDB] Failed deleting node via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/nodes/${nodeId}.json`, { method: "DELETE" });
      await fetch(`${databaseURL}/telemetry/${nodeId}.json`, { method: "DELETE" });
    } catch {}
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
          } else {
            rtdbService.seedDefaultAlerts();
            const fallback = localStorage.getItem(CACHE_ALERTS_KEY);
            callback(fallback ? JSON.parse(fallback) : []);
          }
        },
        () => {
          const cached = localStorage.getItem(CACHE_ALERTS_KEY);
          callback(cached ? JSON.parse(cached) : []);
        }
      );
    } catch {
      const cached = localStorage.getItem(CACHE_ALERTS_KEY);
      callback(cached ? JSON.parse(cached) : []);
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
    try {
      await set(ref(rtdb, "alerts/alert-init-01"), initialAlert);
      await fetch(`${databaseURL}/alerts/alert-init-01.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialAlert),
      });
    } catch {}
    localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify([initialAlert]));
  },

  createAlert: async (alertData: Omit<Alert, "id">): Promise<string> => {
    const id = "alt_" + Date.now();
    const payload: Alert = {
      ...alertData,
      id,
      timestamp: alertData.timestamp || new Date().toISOString(),
    };
    try {
      const alertRef = ref(rtdb, `alerts/${id}`);
      await set(alertRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed creating alert via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/alerts/${id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
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
    try {
      const alertRef = ref(rtdb, `alerts/${alertId}`);
      await update(alertRef, patch);
    } catch (err) {
      console.warn("[RTDB] Failed acknowledging alert via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/alerts/${alertId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {}
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
    try {
      const alertRef = ref(rtdb, `alerts/${alertId}`);
      await update(alertRef, patch);
    } catch (err) {
      console.warn("[RTDB] Failed resolving alert via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/alerts/${alertId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {}
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
          } else {
            rtdbService.seedDefaultAuditLogs();
            const fallback = localStorage.getItem(CACHE_LOGS_KEY);
            callback(fallback ? JSON.parse(fallback) : []);
          }
        },
        () => {
          const cached = localStorage.getItem(CACHE_LOGS_KEY);
          callback(cached ? JSON.parse(cached) : []);
        }
      );
    } catch {
      const cached = localStorage.getItem(CACHE_LOGS_KEY);
      callback(cached ? JSON.parse(cached) : []);
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
      try {
        await set(ref(rtdb, `auditLogs/${l.id}`), l);
        await fetch(`${databaseURL}/auditLogs/${l.id}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(l),
        });
      } catch {}
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
    try {
      const auditRef = ref(rtdb, `auditLogs/${id}`);
      await set(auditRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed recording audit log via SDK:", err);
    }
    try {
      await fetch(`${databaseURL}/auditLogs/${id}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
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
            callback(snapshot.val() as SystemState);
          } else {
            callback({
              status: "OPTIMAL",
              lastUpdate: new Date().toISOString(),
              version: "2.4.0-prod",
              maintenanceMode: false,
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
    } catch (err) {
      console.warn("[RTDB] Failed updating system state:", err);
    }
  },

  // ==========================================
  // SENSORS MANAGEMENT
  // ==========================================
  subscribeToSensors: (callback: (sensors: SensorData[]) => void): (() => void) => {
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
          } else {
            callback([]);
          }
        },
        () => {
          const cached = localStorage.getItem("gridguard_cache_sensors");
          callback(cached ? JSON.parse(cached) : []);
        }
      );
    } catch {
      const cached = localStorage.getItem("gridguard_cache_sensors");
      callback(cached ? JSON.parse(cached) : []);
      return () => {};
    }
  },

  addSensor: async (sensor: Omit<SensorData, "id">): Promise<SensorData> => {
    try {
      const sensorsRef = ref(rtdb, "sensors");
      const newRef = push(sensorsRef);
      const id = newRef.key || "SN-" + Date.now().toString().slice(-4);
      const payload: SensorData = {
        ...sensor,
        id,
        lastSeen: new Date().toISOString(),
      };
      await set(newRef, payload);
      return payload;
    } catch (err) {
      console.warn("[RTDB] Failed adding sensor:", err);
      const id = "SN-" + Date.now().toString().slice(-4);
      return { ...sensor, id, lastSeen: new Date().toISOString() };
    }
  },

  updateSensor: async (sensorId: string, data: Partial<SensorData>): Promise<void> => {
    try {
      const sensorRef = ref(rtdb, `sensors/${sensorId}`);
      await update(sensorRef, {
        ...data,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed updating sensor:", err);
    }
  },

  deleteSensor: async (sensorId: string): Promise<void> => {
    try {
      const sensorRef = ref(rtdb, `sensors/${sensorId}`);
      await remove(sensorRef);
    } catch (err) {
      console.warn("[RTDB] Failed deleting sensor:", err);
    }
  },

  saveOtpRecord: async (emailKey: string, payload: any): Promise<void> => {
    try {
      const otpRef = ref(rtdb, `auth_otps/${emailKey}`);
      await set(otpRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed saving OTP via SDK, trying REST:", err);
      try {
        await fetch(`${databaseURL}/auth_otps/${emailKey}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (restErr) {
        console.warn("[RTDB] REST OTP save error:", restErr);
      }
    }
  },

  getOtpRecord: async (emailKey: string): Promise<any | null> => {
    try {
      const otpRef = ref(rtdb, `auth_otps/${emailKey}`);
      const snap = await get(otpRef);
      if (snap.exists()) {
        return snap.val();
      }
    } catch (err) {
      console.warn("[RTDB] Failed getting OTP via SDK, trying REST:", err);
    }

    try {
      const res = await fetch(`${databaseURL}/auth_otps/${emailKey}.json`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
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
    try {
      const queueRef = ref(rtdb, "email_queue");
      const newRef = push(queueRef);
      await set(newRef, {
        ...payload,
        queuedAt: new Date().toISOString(),
        status: "PENDING",
      });
    } catch (err) {
      console.warn("[RTDB] Failed queueing email:", err);
    }
  },
};

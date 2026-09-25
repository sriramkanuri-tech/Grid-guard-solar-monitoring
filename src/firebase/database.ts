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
const CACHE_NODES_KEY = "gridguard_cache_nodes";
const CACHE_ALERTS_KEY = "gridguard_cache_alerts";
const CACHE_LOGS_KEY = "gridguard_cache_audit";
const CACHE_NOTIFS_KEY = "gridguard_cache_notifs";

export const rtdbService = {
  // ==========================================
  // USERS & MEMBERS MANAGEMENT
  // ==========================================
  subscribeToUsers: (callback: (users: UserProfile[]) => void): (() => void) => {
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
            callback(list);
          } else {
            callback([]);
          }
        },
        () => {
          callback([]);
        }
      );
    } catch {
      return () => {};
    }
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
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await update(userRef, {
        ...profile,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed saving user profile:", err);
    }
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
      console.warn("[RTDB] Failed setting user status:", err);
    }
  },

  setUserRole: async (uid: string, role: "admin" | "member"): Promise<void> => {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await update(userRef, {
        role,
        isAdmin: role === "admin",
      });
    } catch (err) {
      console.warn("[RTDB] Failed setting user role:", err);
    }
  },

  deleteUser: async (uid: string): Promise<void> => {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      await remove(userRef);
    } catch (err) {
      console.warn("[RTDB] Failed deleting user:", err);
    }
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
            callback([]);
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
    try {
      const nodeRef = ref(rtdb, `nodes/${nodeId}`);
      await update(nodeRef, {
        ...nodeData,
        nodeId,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed creating/updating node:", err);
    }
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    try {
      const nodeRef = ref(rtdb, `nodes/${nodeId}`);
      await remove(nodeRef);
      const telRef = ref(rtdb, `telemetry/${nodeId}`);
      await remove(telRef);
    } catch (err) {
      console.warn("[RTDB] Failed deleting node:", err);
    }
  },

  // ==========================================
  // REAL-TIME ALERTS
  // ==========================================
  subscribeToAlerts: (callback: (alerts: Alert[]) => void): (() => void) => {
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
            callback([]);
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

  createAlert: async (alertData: Omit<Alert, "id">): Promise<string> => {
    try {
      const alertsRef = ref(rtdb, "alerts");
      const newAlertRef = push(alertsRef);
      const id = newAlertRef.key || "alt_" + Date.now();
      const payload: Alert = {
        ...alertData,
        id,
        timestamp: new Date().toISOString(),
      };
      await set(newAlertRef, payload);
      return id;
    } catch (err) {
      console.warn("[RTDB] Failed creating alert:", err);
      return "alt_" + Date.now();
    }
  },

  acknowledgeAlert: async (alertId: string, userEmail: string): Promise<void> => {
    try {
      const alertRef = ref(rtdb, `alerts/${alertId}`);
      await update(alertRef, {
        acknowledged: true,
        acknowledgedBy: userEmail,
        acknowledgedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed acknowledging alert:", err);
    }
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    try {
      const alertRef = ref(rtdb, `alerts/${alertId}`);
      await update(alertRef, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[RTDB] Failed resolving alert:", err);
    }
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
            callback([]);
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

  logAuditEvent: async (
    action: string,
    target?: string,
    metadata?: Record<string, unknown>,
    actorUid?: string,
    actorEmail?: string
  ): Promise<void> => {
    try {
      const auditRef = ref(rtdb, "auditLogs");
      const newLogRef = push(auditRef);
      const payload: AuditLogEntry = {
        id: newLogRef.key || "log_" + Date.now(),
        uid: actorUid || "system",
        actorEmail: actorEmail || "system@gridguard.io",
        action,
        target: target || "platform",
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };
      await set(newLogRef, payload);
    } catch (err) {
      console.warn("[RTDB] Failed recording audit log:", err);
    }
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
};

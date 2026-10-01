/**
 * Grid Guard Solar Monitoring - Database Integration Service
 * PRIMARY PERSISTENT DATABASE: PostgreSQL 18 via FastAPI Backend Bridge.
 * 
 * Replaces Firebase Realtime Database with high-performance REST polling
 * against FastAPI connected to PostgreSQL 18 ('gridguardsolarmonitoring').
 */
import { getEffectiveApiUrl } from "../services/apiClient";
import type { UserProfile } from "../types/user";
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
  dc_power?: number;
  ac_power?: number;
  ambient_temperature?: number;
  module_temperature?: number;
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
  status: "OPTIMAL" | "DEGRADED" | "OFFLINE" | "MAINTENANCE";
  lastUpdate: string;
  version: string;
  maintenanceMode: boolean;
  stopMlDetectionMails?: boolean;
}

// Local caching keys for sub-millisecond initial render
const CACHE_USERS_KEY = "gridguard_cache_users";
const CACHE_NODES_KEY = "gridguard_cache_nodes";
const CACHE_ALERTS_KEY = "gridguard_cache_alerts";
const CACHE_LOGS_KEY = "gridguard_cache_audit";
const CACHE_NOTIFS_KEY = "gridguard_cache_notifs";
const CACHE_ANOMALIES_KEY = "gridguard_cache_anomalies";
const CACHE_ML_HISTORY_KEY = "gridguard_cache_ml_history";
const CACHE_SENSORS_KEY = "gridguard_cache_sensors";

const getApiBase = (): string => getEffectiveApiUrl();

/**
 * Universal backend REST fetcher with error resilience
 */
async function backendFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  const base = getApiBase();
  const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Legacy RTDB helpers kept for backwards compatibility with any remaining code
export async function rtdbPut<T>(path: string, data: T): Promise<void> {
  if (path.startsWith("users/")) {
    const payload = data as Partial<UserProfile>;
    if (payload && payload.email) {
      await rtdbService.saveUserProfile(payload.uid || path.replace("users/", ""), payload);
    }
  }
}

export async function rtdbPatch<T>(path: string, patchData: T): Promise<void> {
  if (path.startsWith("users/")) {
    const uid = path.replace("users/", "");
    const patch = patchData as any;
    if (patch.role) await rtdbService.setUserRole(uid, patch.role);
    if (patch.status) await rtdbService.setUserStatus(uid, patch.status);
  }
}

export async function rtdbDelete(path: string): Promise<void> {
  if (path.startsWith("users/")) {
    await rtdbService.deleteUser(path.replace("users/", ""));
  }
}

export async function rtdbFetch<T>(path: string): Promise<T | null> {
  if (path === "users") {
    const users = await backendFetch<UserProfile[]>("/api/users");
    if (users) {
      const map: Record<string, UserProfile> = {};
      users.forEach((u) => { map[u.uid] = u; });
      return map as unknown as T;
    }
  }
  return null;
}

// ============================================================
// RTDB SERVICE (MIGRATED TO POSTGRESQL 18 VIA FASTAPI)
// ============================================================
export const rtdbService = {
  // ==========================================
  // USERS MANAGEMENT (PostgreSQL 'users' table)
  // ==========================================
  subscribeToUsers: (callback: (users: UserProfile[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_USERS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    let isSubscribed = true;
    const fetchUsers = async () => {
      const data = await backendFetch<UserProfile[]>("/api/users");
      if (data && isSubscribed) {
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchUsers();
    const interval = window.setInterval(fetchUsers, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  seedDefaultAdmin: async (): Promise<void> => {
    await backendFetch("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: "Sriram Kanuri",
        email: "sriramkanuri4@gmail.com",
        role: "admin",
        is_active: true,
      }),
    });
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const data = await backendFetch<UserProfile>(`/api/users/profile?uid=${encodeURIComponent(uid)}`);
    if (data) return data;

    const cached = localStorage.getItem(CACHE_USERS_KEY);
    if (cached) {
      try {
        const list: any[] = JSON.parse(cached);
        const match = list.find((u) => u.uid === uid || u.id === uid || u.firebase_uid === uid);
        if (match) return match as UserProfile;
      } catch {}
    }
    return null;
  },

  saveUserProfile: async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
    const cleanEmail = (profile.email || "").trim().toLowerCase();
    const isAdmin =
      profile.isAdmin === true ||
      profile.role === "admin" ||
      cleanEmail === "sriramkanuri4@gmail.com";
    const role = isAdmin ? "admin" : "member";
    const status = profile.status || ((profile as any).is_active === false ? "disabled" : "active");
    const isActive = status === "active";

    const payload = {
      name: profile.name,
      email: cleanEmail || "sriramkanuri4@gmail.com",
      phone: profile.phone,
      role,
      isAdmin,
      status,
      is_active: isActive,
      firebase_uid: profile.uid || uid,
      profile_image: (profile as any).profile_image || profile.avatarUrl || profile.photoURL,
    };

    // 1. Post to PostgreSQL users table
    await backendFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // 2. Also execute direct PUT if updating existing user by email or uid
    if (cleanEmail) {
      await backendFetch(`/api/users/${encodeURIComponent(cleanEmail)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      const list: UserProfile[] = cached ? JSON.parse(cached) : [];
      const updatedUser: UserProfile = {
        uid: profile.uid || uid,
        name: profile.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        phone: profile.phone,
        role,
        isAdmin,
        status,
        mfaEnabled: profile.mfaEnabled ?? false,
        createdAt: profile.createdAt || new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };
      const updated = [
        ...list.filter((u) => u.uid !== uid && u.email?.toLowerCase() !== cleanEmail),
        updatedUser,
      ];
      localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
    } catch {}
  },

  saveMfaSecret: async (email: string, secret: string): Promise<void> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      localStorage.setItem(`gridguard_mfa_${cleanEmail}`, secret);
      const user = await rtdbService.findUserProfileByEmail(cleanEmail);
      if (user) {
        await backendFetch(`/api/users/${user.uid}`, {
          method: "PUT",
          body: JSON.stringify({ mfaSecret: secret, mfaEnabled: true }),
        });
      }
    } catch (err) {
      console.warn("[PostgreSQL] Failed saving MFA secret:", err);
    }
  },

  getMfaSecret: async (email: string): Promise<string | null> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const local = localStorage.getItem(`gridguard_mfa_${cleanEmail}`);
      if (local) return local;

      const user = await rtdbService.findUserProfileByEmail(cleanEmail);
      if (user && user.mfaSecret) return user.mfaSecret;

      return null;
    } catch {
      return null;
    }
  },

  removeMfaSecret: async (email: string): Promise<void> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      localStorage.removeItem(`gridguard_mfa_${cleanEmail}`);
      const user = await rtdbService.findUserProfileByEmail(cleanEmail);
      if (user) {
        await backendFetch(`/api/users/${user.uid}`, {
          method: "PUT",
          body: JSON.stringify({ mfaSecret: null, mfaEnabled: false }),
        });
      }
    } catch (err) {
      console.warn("[PostgreSQL] Failed removing MFA secret:", err);
    }
  },

  findUserProfileByEmail: async (email: string): Promise<UserProfile | null> => {
    const cleanEmail = email.trim().toLowerCase();
    const data = await backendFetch<UserProfile>(`/api/users/profile?email=${encodeURIComponent(cleanEmail)}`);
    if (data) return data;

    const cached = localStorage.getItem(CACHE_USERS_KEY);
    if (cached) {
      try {
        const list: UserProfile[] = JSON.parse(cached);
        const match = list.find((u) => u.email && u.email.trim().toLowerCase() === cleanEmail);
        if (match) return match;
      } catch {}
    }
    return null;
  },

  setUserStatus: async (uid: string, status: "active" | "disabled", email?: string): Promise<void> => {
    const payload = { status, is_active: status === "active" };
    await backendFetch(`/api/users/${encodeURIComponent(uid)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (email && email.includes("@")) {
      await backendFetch(`/api/users/${encodeURIComponent(email.trim().toLowerCase())}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        const updated = list.map((u) =>
          u.uid === uid || (email && u.email?.toLowerCase() === email.toLowerCase())
            ? { ...u, status, is_active: status === "active" }
            : u
        );
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  setUserRole: async (uid: string, role: "admin" | "member", email?: string): Promise<void> => {
    const isAdmin = role === "admin";
    const payload = { role, isAdmin };
    await backendFetch(`/api/users/${encodeURIComponent(uid)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (email && email.includes("@")) {
      await backendFetch(`/api/users/${encodeURIComponent(email.trim().toLowerCase())}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        const updated = list.map((u) =>
          u.uid === uid || (email && u.email?.toLowerCase() === email.toLowerCase())
            ? { ...u, role, isAdmin }
            : u
        );
        localStorage.setItem(CACHE_USERS_KEY, JSON.stringify(updated));
      }
    } catch {}
  },

  deleteUser: async (uid: string, email?: string): Promise<void> => {
    await backendFetch(`/api/users/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
    if (email && email.includes("@")) {
      await backendFetch(`/api/users/${encodeURIComponent(email.trim().toLowerCase())}`, {
        method: "DELETE",
      });
    }

    try {
      const cached = localStorage.getItem(CACHE_USERS_KEY);
      if (cached) {
        const list: UserProfile[] = JSON.parse(cached);
        localStorage.setItem(
          CACHE_USERS_KEY,
          JSON.stringify(list.filter((u) => u.uid !== uid && (!email || u.email?.toLowerCase() !== email.toLowerCase())))
        );
      }
    } catch {}
  },

  getAllUserEmails: async (): Promise<string[]> => {
    const emails = new Set<string>();
    emails.add("sriramkanuri4@gmail.com");

    const users = await backendFetch<UserProfile[]>("/api/users");
    if (users && Array.isArray(users)) {
      users.forEach((u) => {
        if (u.email && u.email.includes("@")) {
          emails.add(u.email.trim().toLowerCase());
        }
      });
    }

    return Array.from(emails);
  },

  // ==========================================
  // REAL-TIME TELEMETRY (PostgreSQL 'sensor_readings' & 'grid_telemetry')
  // ==========================================
  subscribeToTelemetry: (
    nodeId: string,
    callback: (data: RealtimeTelemetry | null) => void
  ): (() => void) => {
    let isSubscribed = true;

    const fetchLive = async () => {
      const data = await backendFetch<RealtimeTelemetry>(`/api/telemetry/live/${encodeURIComponent(nodeId)}`);
      if (data && isSubscribed) {
        callback(data);
      }
    };

    fetchLive();
    const interval = window.setInterval(fetchLive, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  subscribeToAllTelemetry: (
    callback: (telemetryMap: Record<string, RealtimeTelemetry>) => void
  ): (() => void) => {
    let isSubscribed = true;

    const fetchAll = async () => {
      const data = await backendFetch<Record<string, RealtimeTelemetry>>("/api/telemetry/live");
      if (data && isSubscribed) {
        callback(data);
      }
    };

    fetchAll();
    const interval = window.setInterval(fetchAll, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  pushTelemetry: async (nodeId: string, data: Partial<RealtimeTelemetry>): Promise<void> => {
    await backendFetch("/api/telemetry", {
      method: "POST",
      body: JSON.stringify({
        nodeId,
        voltage: data.voltage ?? 230.0,
        current: data.current ?? 12.0,
        power: data.power ?? 4.5,
        energy: data.energy ?? 45.0,
        temperature: data.temperature ?? 35.0,
        irradiance: data.irradiance ?? 850.0,
        frequency: data.frequency ?? 50.02,
        powerFactor: data.powerFactor ?? 0.98,
        status: data.status || "ONLINE",
      }),
    });
  },

  // ==========================================
  // SOLAR NODES MANAGEMENT (PostgreSQL 'solar_nodes')
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

    let isSubscribed = true;
    const fetchNodes = async () => {
      const data = await backendFetch<SolarNode[]>("/api/nodes");
      if (data && isSubscribed) {
        localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchNodes();
    const interval = window.setInterval(fetchNodes, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  createOrUpdateNode: async (nodeId: string, nodeData: Partial<SolarNode>): Promise<void> => {
    await backendFetch("/api/nodes", {
      method: "POST",
      body: JSON.stringify({
        nodeId,
        name: nodeData.name || nodeId,
        location: nodeData.location,
        status: nodeData.status || "ONLINE",
        firmware_version: nodeData.firmware,
      }),
    });

    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      const list: SolarNode[] = cached ? JSON.parse(cached) : [];
      const updated = [...list.filter((n) => n.nodeId !== nodeId), { ...nodeData, nodeId } as SolarNode];
      localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(updated));
    } catch {}
  },

  updateNodeStatus: async (
    nodeId: string,
    status: "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL"
  ): Promise<void> => {
    await backendFetch(`/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    await backendFetch(`/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "DELETE",
    });

    try {
      const cached = localStorage.getItem(CACHE_NODES_KEY);
      if (cached) {
        const list: SolarNode[] = JSON.parse(cached);
        localStorage.setItem(CACHE_NODES_KEY, JSON.stringify(list.filter((n) => n.nodeId !== nodeId)));
      }
    } catch {}
  },

  // ==========================================
  // ALERTS (PostgreSQL 'alerts' table)
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

    let isSubscribed = true;
    const fetchAlerts = async () => {
      const data = await backendFetch<Alert[]>("/api/alerts");
      if (data && isSubscribed) {
        localStorage.setItem(CACHE_ALERTS_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchAlerts();
    const interval = window.setInterval(fetchAlerts, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  seedDefaultAlerts: async (): Promise<void> => {
    await backendFetch("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        nodeId: "GG-NODE-01",
        type: "system",
        severity: "INFO",
        title: "Grid Guard System Online",
        message: "Synchronized with PostgreSQL 18 persistent database.",
        value: 231.2,
        threshold: 245.0,
      }),
    });
  },

  createAlert: async (alertData: Omit<Alert, "id">): Promise<string> => {
    const res = await backendFetch<{ success: boolean; id: string }>("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        nodeId: alertData.nodeId || "GG-NODE-01",
        type: alertData.type || "system",
        severity: alertData.severity || "INFO",
        title: (alertData as any).title || alertData.message,
        message: alertData.message,
        value: alertData.value,
        threshold: alertData.threshold,
      }),
    });
    return res?.id || `alt_${Date.now()}`;
  },

  acknowledgeAlert: async (alertId: string, userEmail: string): Promise<void> => {
    await backendFetch(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ acknowledgedBy: userEmail }),
    });
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    await backendFetch(`/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: "POST",
    });
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  subscribeToNotifications: (
    recipientUid: string,
    callback: (notifs: SystemNotification[]) => void
  ): (() => void) => {
    const cached = localStorage.getItem(CACHE_NOTIFS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        callback(parsed);
      } catch {}
    }

    let isSubscribed = true;
    const fetchNotifs = async () => {
      const alerts = await backendFetch<Alert[]>("/api/alerts");
      if (alerts && isSubscribed) {
        const notifs: SystemNotification[] = alerts.map((a) => ({
          id: a.id,
          recipientUid,
          title: (a as any).title || a.message,
          message: a.message,
          type: (String(a.severity).toUpperCase() === "CRITICAL" ? "CRITICAL" : String(a.severity).toUpperCase() === "WARNING" ? "WARNING" : "INFO"),
          timestamp: String(a.timestamp),
          read: a.acknowledged || false,
        }));
        localStorage.setItem(CACHE_NOTIFS_KEY, JSON.stringify(notifs));
        callback(notifs);
      }
    };

    fetchNotifs();
    const interval = window.setInterval(fetchNotifs, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  markNotificationRead: async (notifId: string): Promise<void> => {
    await rtdbService.acknowledgeAlert(notifId, "operator");
  },

  sendNotification: async (notif: Omit<SystemNotification, "id">): Promise<void> => {
    await rtdbService.createAlert({
      nodeId: "GG-NODE-01",
      type: "notification",
      severity: notif.type === "CRITICAL" ? "CRITICAL" : notif.type === "WARNING" ? "WARNING" : "INFO",
      message: notif.message,
      resolved: false,
      status: "OPEN",
      timestamp: notif.timestamp || new Date().toISOString(),
    });
  },

  // ==========================================
  // AUDIT LOGS (PostgreSQL 'audit_logs')
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

    let isSubscribed = true;
    const fetchLogs = async () => {
      const data = await backendFetch<AuditLogEntry[]>("/api/audit-logs");
      if (data && isSubscribed) {
        localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchLogs();
    const interval = window.setInterval(fetchLogs, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  seedDefaultAuditLogs: async (): Promise<void> => {
    await backendFetch("/api/audit-logs", {
      method: "POST",
      body: JSON.stringify({
        action: "POSTGRESQL_18_MIGRATED",
        target: "gridguardsolarmonitoring",
        metadata: { database: "PostgreSQL 18", status: "OPTIMAL" },
        actorEmail: "sriramkanuri4@gmail.com",
      }),
    });
  },

  logAuditEvent: async (
    action: string,
    target?: string,
    metadata?: Record<string, unknown>,
    actorUid?: string,
    actorEmail?: string
  ): Promise<void> => {
    await backendFetch("/api/audit-logs", {
      method: "POST",
      body: JSON.stringify({
        action,
        target: target || "platform",
        metadata: metadata || {},
        actorUid: actorUid || "system",
        actorEmail: actorEmail || "sriramkanuri4@gmail.com",
      }),
    });
  },

  // ==========================================
  // SYSTEM STATE (PostgreSQL 'system_status')
  // ==========================================
  subscribeToSystem: (callback: (state: SystemState | null) => void): (() => void) => {
    let isSubscribed = true;

    const fetchSystem = async () => {
      const data = await backendFetch<SystemState>("/api/system/status");
      if (data && isSubscribed) {
        callback(data);
      }
    };

    fetchSystem();
    const interval = window.setInterval(fetchSystem, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  updateSystemState: async (state: Partial<SystemState>): Promise<void> => {
    await backendFetch("/api/system/settings", {
      method: "POST",
      body: JSON.stringify(state),
    });
  },

  setMlDetectionEmailsStopped: async (stopped: boolean): Promise<void> => {
    localStorage.setItem("gridguard_stop_ml_detection_mails", JSON.stringify(stopped));
    await backendFetch("/api/system/settings", {
      method: "POST",
      body: JSON.stringify({ stopMlDetectionMails: stopped, stop_ml_detection_mails: stopped }),
    });
  },

  getMlDetectionEmailsStopped: async (): Promise<boolean> => {
    const data = await backendFetch<{ stopMlDetectionMails?: boolean; stop_ml_detection_mails?: boolean }>("/api/system/settings");
    if (data) {
      return Boolean(data.stopMlDetectionMails ?? data.stop_ml_detection_mails ?? false);
    }
    const cached = localStorage.getItem("gridguard_stop_ml_detection_mails");
    return cached ? JSON.parse(cached) : false;
  },

  // ==========================================
  // SENSORS MANAGEMENT (PostgreSQL 'sensors')
  // ==========================================
  subscribeToSensors: (callback: (sensors: SensorData[]) => void): (() => void) => {
    const cached = localStorage.getItem(CACHE_SENSORS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      } catch {}
    }

    let isSubscribed = true;
    const fetchSensors = async () => {
      const data = await backendFetch<SensorData[]>("/api/sensors");
      if (data && isSubscribed) {
        localStorage.setItem(CACHE_SENSORS_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchSensors();
    const interval = window.setInterval(fetchSensors, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  addSensor: async (sensor: Omit<SensorData, "id">): Promise<SensorData> => {
    const sensorId = "SN-" + Date.now().toString().slice(-4);
    await backendFetch("/api/sensors", {
      method: "POST",
      body: JSON.stringify({
        sensor_id: sensorId,
        node_id: "GG-NODE-01",
        name: sensor.name,
        location: sensor.room,
        status: sensor.status || "normal",
        unit: "kW",
      }),
    });

    const created: SensorData = {
      ...sensor,
      id: sensorId,
      lastSeen: new Date().toISOString(),
    };
    return created;
  },

  updateSensor: async (sensorId: string, data: Partial<SensorData>): Promise<void> => {
    await backendFetch(`/api/sensors/${encodeURIComponent(sensorId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteSensor: async (sensorId: string): Promise<void> => {
    await backendFetch(`/api/sensors/${encodeURIComponent(sensorId)}`, {
      method: "DELETE",
    });
  },

  // ==========================================
  // OTP & QUEUE DISPATCH
  // ==========================================
  saveOtpRecord: async (emailKey: string, payload: any): Promise<void> => {
    localStorage.setItem(`gridguard_otp_${emailKey}`, JSON.stringify(payload));
  },

  getOtpRecord: async (emailKey: string): Promise<any | null> => {
    const local = localStorage.getItem(`gridguard_otp_${emailKey}`);
    return local ? JSON.parse(local) : null;
  },

  removeOtpRecord: async (emailKey: string): Promise<void> => {
    localStorage.removeItem(`gridguard_otp_${emailKey}`);
  },

  queueEmailBroadcast: async (payload: any): Promise<void> => {
    await backendFetch("/api/admin/send-email", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  queueOtpDispatch: async (email: string, otp: string): Promise<void> => {
    await backendFetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  // ==========================================
  // ANOMALY DETECTION & ML RECORDS (PostgreSQL 'ml_detections')
  // ==========================================
  recordAnomaly: async (anomalyData: Omit<AnomalyRecord, "id"> & { id?: string }): Promise<string> => {
    const res = await backendFetch<{ success: boolean; id: string }>("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        nodeId: anomalyData.nodeId || "GG-NODE-01",
        type: "ANOMALY_DETECTION",
        severity: "CRITICAL",
        title: "Isolation Forest Anomaly Flagged",
        message: anomalyData.message || "Abnormal solar array generation disparity",
        value: anomalyData.anomalyScore,
        threshold: 0.0,
      }),
    });
    return res?.id || `anom_${Date.now()}`;
  },

  subscribeToAnomalies: (callback: (anomalies: AnomalyRecord[]) => void): (() => void) => {
    let isSubscribed = true;

    const fetchAnoms = async () => {
      const data = await backendFetch<any[]>("/api/ml/detections");
      if (data && isSubscribed) {
        const formatted: AnomalyRecord[] = data.map((d) => ({
          id: d.id,
          nodeId: "GG-NODE-01",
          timestamp: d.timestamp,
          status: "ABNORMAL",
          prediction: d.prediction || -1,
          anomalyScore: d.anomaly_score || -0.5,
          message: "Isolation Forest flagged abnormal generation disparity",
          inputs: {
            dc: d.dc_power || 5800,
            ac: d.ac_power || 440,
            ambientTemp: d.ambient_temp || 32,
            moduleTemp: d.module_temp || 88,
            irradiation: d.irradiance ? d.irradiance / 1000 : 0.85,
            hour: 12,
          },
          emailAlertSent: true,
          resolved: false,
          createdAt: d.timestamp,
        }));
        localStorage.setItem(CACHE_ANOMALIES_KEY, JSON.stringify(formatted));
        callback(formatted);
      }
    };

    fetchAnoms();
    const interval = window.setInterval(fetchAnoms, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  saveMlInference: async (item: InferenceHistoryItem): Promise<void> => {
    try {
      const cached = localStorage.getItem(CACHE_ML_HISTORY_KEY);
      const list: InferenceHistoryItem[] = cached ? JSON.parse(cached) : [];
      const updated = [item, ...list.filter((h) => h.id !== item.id)].slice(0, 30);
      localStorage.setItem(CACHE_ML_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  },

  subscribeToMlHistory: (callback: (history: InferenceHistoryItem[]) => void): (() => void) => {
    let isSubscribed = true;

    const fetchHistory = async () => {
      const data = await backendFetch<InferenceHistoryItem[]>("/api/ml/history");
      if (data && isSubscribed && data.length > 0) {
        localStorage.setItem(CACHE_ML_HISTORY_KEY, JSON.stringify(data));
        callback(data);
      }
    };

    fetchHistory();
    const interval = window.setInterval(fetchHistory, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  },

  saveUserCredential: async (emailKey: string, pass: string): Promise<void> => {
    localStorage.setItem(`gridguard_cred_${emailKey}`, pass);
  },

  getUserCredential: async (emailKey: string): Promise<{ password?: string } | null> => {
    const pass = localStorage.getItem(`gridguard_cred_${emailKey}`);
    return pass ? { password: pass } : null;
  },
};

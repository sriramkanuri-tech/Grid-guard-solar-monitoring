/**
 * Presence Manager for Grid Guard Solar Monitoring.
 * Synchronizes operator session presence directly with PostgreSQL 18 'presence' table via FastAPI.
 */
import { getEffectiveApiUrl } from "../services/apiClient";

export interface UserPresence {
  uid: string;
  online: boolean;
  lastSeen: number | string | object;
  sessionId?: string;
  email?: string;
  name?: string;
}

class PresenceManager {
  private currentUid: string | null = null;
  private currentEmail: string | null = null;
  private currentName: string | null = null;
  private sessionId: string = "sess_" + Math.random().toString(36).substring(2, 9);
  private heartbeatTimer: number | null = null;

  public initializePresence(uid: string, email?: string, name?: string) {
    this.currentUid = uid;
    this.currentEmail = email || null;
    this.currentName = name || null;

    this.sendHeartbeat(true);

    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
    }

    // Ping PostgreSQL presence every 15 seconds
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat(true);
    }, 15000);

    // Register offline on unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.sendHeartbeat(false, true);
      });
    }
  }

  private sendHeartbeat(online: boolean, useBeacon = false) {
    const email = this.currentEmail || (typeof window !== "undefined" ? localStorage.getItem("gridguard_user_email") : null);
    if (!email) return;

    const baseUrl = getEffectiveApiUrl();
    const endpoint = online ? `${baseUrl}/api/presence/heartbeat` : `${baseUrl}/api/presence/offline`;
    const payload = JSON.stringify({
      user_email: email,
      session_id: this.sessionId,
      online,
    });

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    }
  }

  public async setOffline(uid?: string) {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.sendHeartbeat(false);
    this.currentUid = null;
    this.currentEmail = null;
  }

  public subscribeToAllPresence(
    callback: (presenceMap: Record<string, UserPresence>) => void
  ): () => void {
    let isActive = true;

    const fetchPresence = async () => {
      try {
        const baseUrl = getEffectiveApiUrl();
        const res = await fetch(`${baseUrl}/api/presence`);
        if (res.ok && isActive) {
          const map = await res.json();
          callback(map as Record<string, UserPresence>);
        }
      } catch {
        // Fallback to local user
        if (isActive) {
          callback({});
        }
      }
    };

    fetchPresence();
    const timer = window.setInterval(fetchPresence, 3000);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }
}

export const presenceManager = new PresenceManager();

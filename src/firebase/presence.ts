import {
  ref,
  onValue,
  set,
  update,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "./config";

export interface UserPresence {
  uid: string;
  online: boolean;
  lastSeen: number | object;
  sessionId?: string;
  email?: string;
  name?: string;
}

class PresenceManager {
  private currentUid: string | null = null;
  private sessionId: string = "sess_" + Math.random().toString(36).substring(2, 9);
  private connectedUnsub: (() => void) | null = null;

  public initializePresence(uid: string, email?: string, name?: string) {
    this.currentUid = uid;

    try {
      const connectedRef = ref(rtdb, ".info/connected");
      const userPresenceRef = ref(rtdb, `presence/${uid}`);

      if (this.connectedUnsub) {
        this.connectedUnsub();
      }

      this.connectedUnsub = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // When disconnected, mark offline
          onDisconnect(userPresenceRef).update({
            online: false,
            lastSeen: serverTimestamp(),
          });

          // Mark online now
          set(userPresenceRef, {
            uid,
            online: true,
            lastSeen: serverTimestamp(),
            sessionId: this.sessionId,
            email: email || "",
            name: name || "",
          }).catch((err) => {
            console.warn("[Presence Error] Could not set online state:", err);
          });
        }
      });
    } catch (err) {
      console.warn("[Presence Error] RTDB presence initialization failed:", err);
    }
  }

  public async setOffline(uid?: string) {
    const targetUid = uid || this.currentUid;
    if (!targetUid) return;

    try {
      const userPresenceRef = ref(rtdb, `presence/${targetUid}`);
      await update(userPresenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[Presence Error] Failed setting offline:", err);
    }

    if (this.connectedUnsub) {
      this.connectedUnsub();
      this.connectedUnsub = null;
    }
    this.currentUid = null;
  }

  public subscribeToAllPresence(
    callback: (presenceMap: Record<string, UserPresence>) => void
  ): () => void {
    try {
      const presenceRootRef = ref(rtdb, "presence");
      return onValue(
        presenceRootRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val() as Record<string, UserPresence>);
          } else {
            callback({});
          }
        },
        (error) => {
          console.warn("[Presence Error] Subscribe error:", error);
          callback({});
        }
      );
    } catch (err) {
      console.warn("[Presence Error] Subscribe setup failed:", err);
      return () => {};
    }
  }
}

export const presenceManager = new PresenceManager();

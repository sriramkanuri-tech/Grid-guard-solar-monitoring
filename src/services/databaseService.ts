import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase/config";
import type { GridData } from "../types/grid";
import type { UserProfile } from "../types/user";

export interface TelemetryLogRecord {
  id: string;
  timestamp: string;
  solarPower: number;
  energyToday: number;
  gridVoltage: number;
  gridCurrent: number;
  gridFrequency: number;
  powerFactor: number;
  temperature: number;
  batteryPercentage: number;
  co2SavedToday: number;
}

export interface StoredUserCredential {
  uid: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  lastLogin: string;
}

const DB_USERS_KEY = "gridguard_database_users";
const DB_TELEMETRY_KEY = "gridguard_database_telemetry";
const MAX_LOGS = 120;

class DatabaseService {
  private telemetryLogs: TelemetryLogRecord[] = [];
  private logListeners: Set<(logs: TelemetryLogRecord[]) => void> = new Set();

  constructor() {
    this.initDefaultUsers();
    this.loadInitialLogs();
  }

  private initDefaultUsers() {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(DB_USERS_KEY);
    if (!existing) {
      const defaultUsers: StoredUserCredential[] = [
        {
          uid: "admin-root-01",
          email: "sriramkanuri4@gmail.com",
          password: "admin123",
          name: "System Administrator",
          phone: "+1 800 555 0199",
          role: "System Administrator",
          isAdmin: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          lastLogin: new Date().toISOString(),
        },
        {
          uid: "operator-01",
          email: "sriramkanuri45@gmail.com",
          password: "operator123",
          name: "Sriram Kanuri",
          phone: "+91 98765 43210",
          role: "Lead Energy Engineer",
          isAdmin: false,
          createdAt: "2026-01-15T08:00:00.000Z",
          lastLogin: new Date().toISOString(),
        },
      ];
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  private loadInitialLogs() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(DB_TELEMETRY_KEY);
      if (saved) {
        this.telemetryLogs = JSON.parse(saved);
      }
    } catch {
      this.telemetryLogs = [];
    }
  }

  // ----------------------------------------------------
  // USER CREDENTIALS & AUTH DATABASE
  // ----------------------------------------------------

  public getAllUsers(): StoredUserCredential[] {
    try {
      const raw = localStorage.getItem(DB_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveUserCredential(user: StoredUserCredential): Promise<void> {
    const users = this.getAllUsers();
    const index = users.findIndex(
      (u) => u.email.toLowerCase() === user.email.toLowerCase()
    );

    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }

    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));

    // Save to Firestore if configured
    if (isFirebaseConfigured) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email,
            name: user.name,
            phone: user.phone || "",
            role: user.role,
            isAdmin: user.isAdmin,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Firestore user sync warning:", err);
      }
    }
  }

  public findUserByEmail(email: string): StoredUserCredential | null {
    const users = this.getAllUsers();
    return (
      users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ||
      null
    );
  }

  // ----------------------------------------------------
  // 1-SECOND TELEMETRY DATABASE PERSISTENCE
  // ----------------------------------------------------

  public async saveTelemetryTick(data: GridData): Promise<void> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const record: TelemetryLogRecord = {
      id: `tel-${now.getTime()}`,
      timestamp: timeStr,
      solarPower: data.solarPower,
      energyToday: data.energyToday,
      gridVoltage: data.gridVoltage,
      gridCurrent: data.gridCurrent || 12.4,
      gridFrequency: data.gridFrequency || 50.02,
      powerFactor: data.powerFactor || 0.96,
      temperature: data.temperature || 28.6,
      batteryPercentage: data.batteryPercentage,
      co2SavedToday: data.co2SavedToday || 18.6,
    };

    // Prepend to in-memory logs and cap size
    this.telemetryLogs = [record, ...this.telemetryLogs.slice(0, MAX_LOGS - 1)];

    // Persist to local database (localStorage)
    try {
      localStorage.setItem(
        DB_TELEMETRY_KEY,
        JSON.stringify(this.telemetryLogs.slice(0, 30))
      );
    } catch {
      // ignore quota exceeded if too many items
    }

    // Notify telemetry log subscribers
    this.logListeners.forEach((fn) => fn(this.telemetryLogs));

    // Persist to Firebase Firestore if connected
    if (isFirebaseConfigured) {
      try {
        const curDocRef = doc(db, "gridData", "current");
        await setDoc(
          curDocRef,
          {
            ...data,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Periodically write to history collection (every 5 seconds to reduce write volume)
        if (now.getSeconds() % 5 === 0) {
          const historyColRef = collection(db, "telemetryLogs");
          await addDoc(historyColRef, {
            ...record,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("Firestore telemetry tick warning:", err);
      }
    }
  }

  public getRecentLogs(): TelemetryLogRecord[] {
    return [...this.telemetryLogs];
  }

  public subscribeToLogs(
    fn: (logs: TelemetryLogRecord[]) => void
  ): () => void {
    this.logListeners.add(fn);
    fn(this.telemetryLogs);
    return () => {
      this.logListeners.delete(fn);
    };
  }
}

export const databaseService = new DatabaseService();

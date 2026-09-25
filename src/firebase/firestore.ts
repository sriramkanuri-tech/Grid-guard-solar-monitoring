import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";
import type { GridData } from "../types/grid";
import type { SensorData } from "../types/sensor";
import type { EnergyData } from "../types/energy";
import type { Alert } from "../types/alert";

/**
 * Subscribes to realtime gridData/current document in Firestore
 */
export const subscribeToGridDataFirestore = (
  onData: (data: GridData | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const docRef = doc(db, "gridData", "current");
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data();
          const grid: GridData = {
            solarPower: Number(raw.solarPower ?? 4.82),
            energyToday: Number(raw.energyToday ?? 45.2),
            gridVoltage: Number(raw.gridVoltage ?? 230.4),
            batteryPercentage: Number(raw.batteryPercentage ?? 82),
            systemStatus: raw.systemStatus || "online",
            gridCurrent: raw.gridCurrent ? Number(raw.gridCurrent) : 12.4,
            gridFrequency: raw.gridFrequency ? Number(raw.gridFrequency) : 50.02,
            powerFactor: raw.powerFactor ? Number(raw.powerFactor) : 0.96,
            temperature: raw.temperature ? Number(raw.temperature) : 42.5,
            systemEfficiency: raw.systemEfficiency ? Number(raw.systemEfficiency) : 91.8,
            co2SavedToday: raw.co2SavedToday ? Number(raw.co2SavedToday) : 18.6,
            updatedAt: raw.updatedAt,
            isDemo: false,
          };
          onData(grid);
        } else {
          onData(null);
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err: unknown) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
};

/**
 * Update current grid data in Firestore
 */
export const updateCurrentGridData = async (data: Partial<GridData>): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const docRef = doc(db, "gridData", "current");
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Subscribes to realtime sensors collection in Firestore
 */
export const subscribeToSensorsFirestore = (
  onData: (sensors: SensorData[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const colRef = collection(db, "sensors");
    return onSnapshot(
      colRef,
      (snapshot) => {
        const sensors: SensorData[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Sensor " + docSnap.id.slice(0, 4),
            room: data.room || "Room 1",
            temperature: Number(data.temperature ?? 28.6),
            humidity: Number(data.humidity ?? 62),
            pressure: Number(data.pressure ?? 1008),
            status: data.status || "normal",
            connectionType: data.connectionType || "ESP32",
            endpoint: data.endpoint,
            timestamp: data.timestamp,
          };
        });
        onData(sensors);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err: unknown) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
};

/**
 * Subscribes to realtime alerts collection in Firestore
 */
export const subscribeToAlertsFirestore = (
  onData: (alerts: Alert[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const colRef = collection(db, "alerts");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const alerts: Alert[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || "temperature",
            sensor: data.sensor || "Sensor",
            room: data.room || "Plant Zone",
            value: Number(data.value ?? 0),
            threshold: Number(data.threshold ?? 0),
            severity: data.severity || "warning",
            message: data.message || "Alert triggered",
            resolved: Boolean(data.resolved),
            timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          };
        });
        onData(alerts);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err: unknown) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
};

/**
 * Add a new alert to Firestore
 */
export const addAlertFirestore = async (alert: Omit<Alert, "id">): Promise<string | null> => {
  if (!isFirebaseConfigured) return null;
  const colRef = collection(db, "alerts");
  const docRef = await addDoc(colRef, {
    ...alert,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Resolve an alert in Firestore
 */
export const resolveAlertFirestore = async (alertId: string): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const docRef = doc(db, "alerts", alertId);
  await updateDoc(docRef, { resolved: true });
};

/**
 * Subscribes to realtime energyHistory collection in Firestore
 */
export const subscribeToEnergyHistoryFirestore = (
  onData: (records: EnergyData[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const colRef = collection(db, "energyHistory");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(48));
    return onSnapshot(
      q,
      (snapshot) => {
        const records: EnergyData[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            recordId: docSnap.id,
            power: Number(data.power ?? 0),
            energy: Number(data.energy ?? 0),
            timestamp: data.timestamp,
          };
        });
        onData(records);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch (err: unknown) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return () => {};
  }
};

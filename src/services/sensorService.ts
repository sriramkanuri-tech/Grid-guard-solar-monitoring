import { subscribeToSensorsFirestore } from "../firebase/firestore";
import { isFirebaseConfigured, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { demoDataService } from "./demoDataService";
import type { SensorData } from "../types/sensor";

export const sensorService = {
  subscribe: (callback: (sensors: SensorData[]) => void): (() => void) => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeDemo: (() => void) | null = null;
    let hasFirebaseSensors = false;

    if (isFirebaseConfigured) {
      unsubscribeFirestore = subscribeToSensorsFirestore(
        (sensors) => {
          if (sensors && sensors.length > 0) {
            hasFirebaseSensors = true;
            if (unsubscribeDemo) {
              unsubscribeDemo();
              unsubscribeDemo = null;
            }
            callback(sensors);
          } else if (!hasFirebaseSensors) {
            if (!unsubscribeDemo) {
              unsubscribeDemo = demoDataService.subscribeSensors(callback);
            }
          }
        },
        () => {
          if (!unsubscribeDemo) {
            unsubscribeDemo = demoDataService.subscribeSensors(callback);
          }
        }
      );
    } else {
      unsubscribeDemo = demoDataService.subscribeSensors(callback);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeDemo) unsubscribeDemo();
    };
  },

  addSensor: async (sensor: Omit<SensorData, "id">): Promise<SensorData> => {
    if (isFirebaseConfigured) {
      try {
        const colRef = collection(db, "sensors");
        const docRef = await addDoc(colRef, {
          ...sensor,
          timestamp: serverTimestamp(),
        });
        return {
          ...sensor,
          id: docRef.id,
        };
      } catch (err) {
        console.warn("Could not save sensor to Firestore, saving to local demo:", err);
      }
    }

    return demoDataService.addSensor(sensor);
  },
};

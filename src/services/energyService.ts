import { subscribeToEnergyHistoryFirestore } from "../firebase/firestore";
import { isFirebaseConfigured } from "../firebase/config";
import { demoDataService } from "./demoDataService";
import type { EnergyData, TimeFilter } from "../types/energy";

export const energyService = {
  subscribe: (callback: (records: EnergyData[]) => void): (() => void) => {
    let unsubscribeFirestore: (() => void) | null = null;
    let hasFirebaseRecords = false;

    if (isFirebaseConfigured) {
      unsubscribeFirestore = subscribeToEnergyHistoryFirestore(
        (records) => {
          if (records && records.length > 0) {
            hasFirebaseRecords = true;
            callback(records);
          } else if (!hasFirebaseRecords) {
            callback(energyService.getDemoEnergyRecords());
          }
        },
        () => {
          callback(energyService.getDemoEnergyRecords());
        }
      );
    } else {
      callback(energyService.getDemoEnergyRecords());
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  },

  getHistoricalTrend: (period: TimeFilter) => {
    return demoDataService.getHistoricalTrend(period);
  },

  getHourlyBars: () => {
    return demoDataService.getHourlyGeneration();
  },

  getDemoEnergyRecords: (): EnergyData[] => {
    return [
      { recordId: "rec-1", power: 4.82, energy: 45.2, time: "14:00" },
      { recordId: "rec-2", power: 4.75, energy: 42.1, time: "13:00" },
      { recordId: "rec-3", power: 4.91, energy: 38.4, time: "12:00" },
      { recordId: "rec-4", power: 4.30, energy: 32.6, time: "11:00" },
      { recordId: "rec-5", power: 3.65, energy: 25.1, time: "10:00" },
    ];
  },
};

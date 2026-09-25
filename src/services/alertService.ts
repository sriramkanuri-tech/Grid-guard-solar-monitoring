import {
  subscribeToAlertsFirestore,
  addAlertFirestore,
  resolveAlertFirestore,
} from "../firebase/firestore";
import { isFirebaseConfigured } from "../firebase/config";
import { demoDataService } from "./demoDataService";
import type { Alert } from "../types/alert";

export const alertService = {
  subscribe: (callback: (alerts: Alert[]) => void): (() => void) => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeDemo: (() => void) | null = null;
    let hasFirebaseAlerts = false;

    if (isFirebaseConfigured) {
      unsubscribeFirestore = subscribeToAlertsFirestore(
        (alerts) => {
          if (alerts && alerts.length > 0) {
            hasFirebaseAlerts = true;
            if (unsubscribeDemo) {
              unsubscribeDemo();
              unsubscribeDemo = null;
            }
            callback(alerts);
          } else if (!hasFirebaseAlerts) {
            if (!unsubscribeDemo) {
              unsubscribeDemo = demoDataService.subscribeAlerts(callback);
            }
          }
        },
        () => {
          if (!unsubscribeDemo) {
            unsubscribeDemo = demoDataService.subscribeAlerts(callback);
          }
        }
      );
    } else {
      unsubscribeDemo = demoDataService.subscribeAlerts(callback);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeDemo) unsubscribeDemo();
    };
  },

  /**
   * Generates a new alert when a metric threshold is breached.
   * Does NOT use Telegram bot tokens in frontend; saves directly to Firestore or local demo state.
   */
  createAlert: async (alertData: Omit<Alert, "id">): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await addAlertFirestore(alertData);
        return;
      } catch (err) {
        console.warn("Could not save alert to Firestore, adding to local state:", err);
      }
    }
    demoDataService.addAlert(alertData);
  },

  resolveAlert: async (alertId: string): Promise<void> => {
    if (isFirebaseConfigured && !alertId.startsWith("alt-")) {
      try {
        await resolveAlertFirestore(alertId);
        return;
      } catch (err) {
        console.warn("Could not resolve alert in Firestore:", err);
      }
    }
    demoDataService.resolveAlert(alertId);
  },
};

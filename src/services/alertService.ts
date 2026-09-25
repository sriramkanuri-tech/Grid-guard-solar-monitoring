import { rtdbService } from "../firebase/database";
import { apiClient } from "./apiClient";
import type { Alert } from "../types/alert";

export const alertService = {
  /**
   * Subscribes to live alerts from Firebase Realtime Database
   */
  subscribe: (callback: (alerts: Alert[]) => void): (() => void) => {
    return rtdbService.subscribeToAlerts((alerts) => {
      callback(alerts);
    });
  },

  /**
   * Creates an alert in Realtime Database.
   * If severity is CRITICAL, triggers backend Telegram notification service.
   */
  createAlert: async (alertData: Omit<Alert, "id">): Promise<string> => {
    const alertId = await rtdbService.createAlert(alertData);

    // If critical alert, dispatch Telegram notification via backend
    if (
      String(alertData.severity).toUpperCase() === "CRITICAL" ||
      alertData.severity === "critical"
    ) {
      try {
        await apiClient.sendTelegramAlert({
          message: alertData.message,
          severity: "CRITICAL",
          node_id: alertData.nodeId || "GG-NODE-01",
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[Telegram Alert] Failed notifying backend:", err);
        }
      }
    }

    return alertId;
  },

  /**
   * Acknowledges an alert in Firebase Realtime Database
   */
  acknowledgeAlert: async (alertId: string, userEmail: string): Promise<void> => {
    await rtdbService.acknowledgeAlert(alertId, userEmail);
  },

  /**
   * Resolves an alert in Firebase Realtime Database
   */
  resolveAlert: async (alertId: string): Promise<void> => {
    await rtdbService.resolveAlert(alertId);
  },
};

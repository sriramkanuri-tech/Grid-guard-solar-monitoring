import { rtdbService, type RealtimeTelemetry } from "../firebase/database";
import { telemetrySyncService } from "./telemetrySyncService";
import type { GridData } from "../types/grid";

const PRIMARY_NODE_ID = "GG-NODE-01";

export const gridDataService = {
  /**
   * Subscribes to live solar telemetry stream.
   * Driven by telemetrySyncService which computes dynamic normal generation,
   * reflects all active hardware sensors, and continuously persists to Firebase Realtime Database.
   */
  subscribe: (callback: (data: GridData) => void): (() => void) => {
    return telemetrySyncService.subscribe(callback);
  },

  /**
   * Pushes a new live telemetry reading to Firebase Realtime Database
   */
  pushTelemetry: async (nodeId: string, data: Partial<RealtimeTelemetry>): Promise<void> => {
    await rtdbService.pushTelemetry(nodeId, data);
  },

  getInitialData: (): GridData => {
    return telemetrySyncService.getCurrentData();
  },
};

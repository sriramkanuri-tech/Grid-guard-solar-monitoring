import { subscribeToGridDataFirestore, updateCurrentGridData } from "../firebase/firestore";
import { isFirebaseConfigured } from "../firebase/config";
import { demoDataService } from "./demoDataService";
import type { GridData } from "../types/grid";

export const gridDataService = {
  /**
   * Subscribes to realtime grid data.
   * Priority: Firebase Firestore onSnapshot if available and doc exists.
   * Fallback: Local smooth realistic demoDataService.
   */
  subscribe: (callback: (data: GridData) => void): (() => void) => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeDemo: (() => void) | null = null;
    let hasFirebaseData = false;

    if (isFirebaseConfigured) {
      unsubscribeFirestore = subscribeToGridDataFirestore(
        (data) => {
          if (data) {
            hasFirebaseData = true;
            // If we previously subscribed to demo, clean up
            if (unsubscribeDemo) {
              unsubscribeDemo();
              unsubscribeDemo = null;
            }
            callback({
              ...data,
              isDemo: false,
            });
          } else if (!hasFirebaseData) {
            // Firebase doc doesn't exist yet, fallback to demo
            if (!unsubscribeDemo) {
              unsubscribeDemo = demoDataService.subscribeGrid((demoVal) => {
                callback({ ...demoVal, isDemo: true });
              });
            }
          }
        },
        () => {
          // On Firestore error, fallback to demo mode
          if (!unsubscribeDemo) {
            unsubscribeDemo = demoDataService.subscribeGrid((demoVal) => {
              callback({ ...demoVal, isDemo: true });
            });
          }
        }
      );
    } else {
      // Firebase not configured, directly use local demo data
      unsubscribeDemo = demoDataService.subscribeGrid((demoVal) => {
        callback({ ...demoVal, isDemo: true });
      });
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeDemo) unsubscribeDemo();
    };
  },

  /**
   * Updates grid data (writes to Firestore if configured)
   */
  updateGridData: async (data: Partial<GridData>): Promise<void> => {
    if (isFirebaseConfigured) {
      await updateCurrentGridData(data);
    }
  },

  getInitialData: (): GridData => {
    return demoDataService.getGridData();
  },
};

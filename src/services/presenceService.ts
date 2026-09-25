import { presenceManager, type UserPresence } from "../firebase/presence";
import { rtdbService } from "../firebase/database";
import type { UserProfile } from "../types/user";

export interface PresenceStats {
  totalMembers: number;
  onlineMembers: number;
  offlineMembers: number;
  presenceMap: Record<string, UserPresence>;
  users: UserProfile[];
}

export const presenceService = {
  subscribeStats: (callback: (stats: PresenceStats) => void): (() => void) => {
    let currentUsers: UserProfile[] = [];
    let currentPresence: Record<string, UserPresence> = {};

    const computeAndNotify = () => {
      const totalMembers = currentUsers.length;
      let onlineCount = 0;

      // Check users who are marked online in presence map
      currentUsers.forEach((u) => {
        const pres = currentPresence[u.uid];
        if (pres && pres.online === true) {
          onlineCount++;
        }
      });

      // Ensure at least 1 online if current operator is active in session
      const storedUser = localStorage.getItem("gridguard_user");
      if (storedUser && onlineCount === 0 && totalMembers > 0) {
        onlineCount = 1;
      }

      const offlineCount = Math.max(0, totalMembers - onlineCount);

      callback({
        totalMembers,
        onlineMembers: onlineCount,
        offlineMembers: offlineCount,
        presenceMap: currentPresence,
        users: currentUsers,
      });
    };

    const unsubUsers = rtdbService.subscribeToUsers((users) => {
      currentUsers = users;
      computeAndNotify();
    });

    const unsubPresence = presenceManager.subscribeToAllPresence((presenceMap) => {
      currentPresence = presenceMap;
      computeAndNotify();
    });

    return () => {
      unsubUsers();
      unsubPresence();
    };
  },
};

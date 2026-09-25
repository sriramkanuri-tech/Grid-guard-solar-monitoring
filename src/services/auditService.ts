import { rtdbService, type AuditLogEntry } from "../firebase/database";

export const auditService = {
  subscribe: (callback: (logs: AuditLogEntry[]) => void): (() => void) => {
    return rtdbService.subscribeToAuditLogs(callback);
  },

  log: async (
    action: string,
    target?: string,
    metadata?: Record<string, unknown>,
    actorUid?: string,
    actorEmail?: string
  ): Promise<void> => {
    await rtdbService.logAuditEvent(action, target, metadata, actorUid, actorEmail);
  },
};

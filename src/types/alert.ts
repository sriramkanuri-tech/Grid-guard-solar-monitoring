export type AlertType =
  | "temperature"
  | "voltage"
  | "frequency"
  | "battery"
  | "inverter"
  | "grid"
  | "ml"
  | "communication"
  | "sensor";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO" | "critical" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType | string;
  nodeId?: string;
  sensor?: string;
  room?: string;
  value?: number;
  threshold?: number;
  severity: AlertSeverity;
  message: string;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  timestamp: string | unknown;
}

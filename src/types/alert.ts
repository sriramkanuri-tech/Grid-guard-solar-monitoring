export type AlertType =
  | "temperature"
  | "voltage"
  | "frequency"
  | "battery"
  | "inverter"
  | "grid"
  | "ml";

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  sensor?: string;
  room?: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  timestamp: unknown;
}

export type SystemStatus = "online" | "warning" | "critical" | "offline";

export interface GridData {
  solarPower: number; // in kW
  energyToday: number; // in kWh
  gridVoltage: number; // in V
  batteryPercentage: number; // in %
  systemStatus: SystemStatus;
  gridCurrent?: number; // in A
  gridFrequency?: number; // in Hz
  powerFactor?: number; // e.g. 0.96
  temperature?: number; // inverter temp in °C
  systemEfficiency?: number; // e.g. 91.8%
  co2SavedToday?: number; // in kg
  activeAlertsCount?: number;
  mlHealthScore?: number; // e.g. 92.4%
  updatedAt?: unknown;
  isDemo?: boolean;
}

export interface GridHistoryPoint {
  time: string;
  voltage: number;
  frequency: number;
  powerFactor: number;
  current: number;
  status: "normal" | "warning" | "critical";
}

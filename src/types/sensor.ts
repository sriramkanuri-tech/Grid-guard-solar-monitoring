export type SensorStatus = "normal" | "warning" | "critical" | "offline";

export type SensorConnectionType =
  | "HTTP API"
  | "MQTT"
  | "Firebase"
  | "ESP32"
  | "STM32"
  | "Arduino"
  | "Modbus"
  | "Raspberry Pi";

export interface SensorData {
  id: string;
  name: string;
  room?: string;
  temperature: number; // in °C
  humidity: number; // in %
  pressure: number; // in hPa
  power?: number; // in kW
  voltage?: number; // in V
  current?: number; // in A
  ratedPower?: number; // in kW
  status: SensorStatus;
  connectionType?: SensorConnectionType;
  endpoint?: string;
  lastSeen?: string;
  timestamp?: unknown;
}

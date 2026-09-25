export interface SolarNode {
  nodeId: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "WARNING" | "CRITICAL";
  lastSeen: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  temperature: number;
  firmware: string;
}

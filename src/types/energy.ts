export interface EnergyData {
  recordId?: string;
  power: number; // in kW
  energy: number; // in kWh
  timestamp?: unknown;
  time?: string;
  date?: string;
}

export interface EnergyGenerationPoint {
  time: string;
  solar: number; // kW or generation percentage
  grid: number;
  battery: number;
}

export type TimeFilter = "today" | "7days" | "30days";

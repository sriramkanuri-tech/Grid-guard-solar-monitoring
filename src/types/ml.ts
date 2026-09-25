export interface SolarReadingPayload {
  DC_POWER: number;
  AC_POWER: number;
  AMBIENT_TEMPERATURE: number;
  MODULE_TEMPERATURE: number;
  IRRADIATION: number;
  hour: number;
}

export interface MLPredictionResponse {
  status: "NORMAL" | "ABNORMAL";
  prediction: 1 | -1;
  anomaly_score: number;
  message: string;
  is_anomaly?: boolean;
  model?: string;
  timestamp?: string;
}

export interface MLHealthResponse {
  message: string;
  model: string;
}

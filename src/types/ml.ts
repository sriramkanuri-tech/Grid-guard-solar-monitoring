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

export interface InferenceHistoryItem {
  id: string;
  timestamp: string;
  inputs: {
    dc: number;
    ac: number;
    ambientTemp: number;
    moduleTemp: number;
    irradiation: number;
    hour: number;
  };
  prediction: 1 | -1;
  status: "NORMAL" | "ABNORMAL";
  anomalyScore: number;
  message: string;
}

export interface AnomalyRecord {
  id: string;
  nodeId: string;
  timestamp: string;
  status: "ABNORMAL";
  prediction: number;
  anomalyScore: number;
  message: string;
  inputs: {
    dc: number;
    ac: number;
    ambientTemp: number;
    moduleTemp: number;
    irradiation: number;
    hour: number;
  };
  metrics?: {
    acDcRatio: number;
    tempDisparity?: number;
  };
  emailAlertSent: boolean;
  alertRecipient?: string;
  alertId?: string;
  resolved: boolean;
  createdAt?: string;
}

import { apiClient, ApiError } from "./apiClient";
import type {
  SolarReadingPayload,
  MLPredictionResponse,
  MLHealthResponse,
} from "../types/ml";

export const mlService = {
  /**
   * Health check to determine if Python FastAPI ML microservice is online
   */
  async checkHealth(): Promise<MLHealthResponse> {
    try {
      const data = await apiClient.checkHealth();
      return {
        message: `${data.service} is running`,
        model: data.model || "Isolation Forest",
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Unable to connect to Grid Guard server. Please try again.");
    }
  },

  /**
   * Sends solar parameter readings to the FastAPI Isolation Forest endpoint
   * POST /predict
   */
  async predict(payload: SolarReadingPayload): Promise<MLPredictionResponse> {
    try {
      const data = await apiClient.predictAnomaly(payload);

      return {
        status: data.status,
        prediction: data.prediction,
        anomaly_score: data.anomaly_score,
        message: data.message,
        model: "Isolation Forest",
        timestamp: new Date().toLocaleTimeString(),
        is_anomaly: data.is_anomaly,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Unable to connect to Grid Guard server. Please try again.");
    }
  },
};

import { ML_API_URL } from "../config";
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
      const response = await fetch(`${ML_API_URL}/`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `ML server responded with HTTP status ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof TypeError || (err as Error)?.message?.includes("Failed to fetch")) {
        throw new Error(
          "ML server is offline. Start the Grid Guard ML API on port 8000.",
          { cause: err }
        );
      }
      throw err;
    }
  },

  /**
   * Sends solar parameter readings to the FastAPI Isolation Forest endpoint
   * POST /predict
   */
  async predict(payload: SolarReadingPayload): Promise<MLPredictionResponse> {
    try {
      const response = await fetch(`${ML_API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorDetail = errorData.detail
                .map((d: { msg?: string; loc?: string[] }) => d.msg || JSON.stringify(d))
                .join(", ");
            } else {
              errorDetail = String(errorData.detail);
            }
          }
        } catch {
          // ignore non-json error responses
        }

        throw new Error(
          errorDetail ||
            `ML server error: HTTP ${response.status} (${response.statusText})`
        );
      }

      const data = await response.json();

      if (!data || typeof data.prediction === "undefined" || !data.status) {
        throw new Error("Invalid API response received from ML server.");
      }

      return {
        status: data.status,
        prediction: data.prediction,
        anomaly_score: data.anomaly_score,
        message: data.message,
        model: "Isolation Forest",
        timestamp: new Date().toLocaleTimeString(),
      };
    } catch (err: unknown) {
      if (err instanceof TypeError || (err as Error)?.message?.includes("Failed to fetch")) {
        throw new Error(
          "ML server is offline. Start the Grid Guard ML API on port 8000.",
          { cause: err }
        );
      }
      throw err;
    }
  },
};

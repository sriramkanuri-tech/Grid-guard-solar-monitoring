/**
 * Centralized API Client for Grid Guard Solar Monitoring.
 * Automatically resolves the base URL from environment variables:
 * Priority: VITE_API_URL -> VITE_BACKEND_API_URL -> VITE_ML_API_URL -> http://127.0.0.1:8000
 *
 * Provides normalized, friendly error handling (preventing raw "Failed to fetch" browser crashes)
 * and strictly isolates debug logging to development mode.
 */

export const API_URL: string = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_ML_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 0, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Universal fetch wrapper that handles network disconnects gracefully.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch {
        errorDetail = await response.text();
      }

      if (import.meta.env.DEV) {
        console.error(`[GridGuard API Error ${response.status}] ${url}:`, errorDetail);
      }

      throw new ApiError(
        errorDetail || `Server returned error (${response.status})`,
        response.status,
        errorDetail
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // In development mode, log actual error to the console for debugging
    if (import.meta.env.DEV) {
      console.error(`[GridGuard API Network Error] Unable to connect to ${url}:`, err);
    }

    // In production and user-facing UI, throw friendly error instead of "Failed to fetch"
    throw new ApiError(
      "Unable to connect to Grid Guard server. Please try again.",
      0,
      err
    );
  }
}

export interface SendEmailPayload {
  recipients: string[];
  subject: string;
  message: string;
  html_message?: string;
  sender_name?: string;
}

export interface SolarTelemetryPayload {
  DC_POWER: number;
  AC_POWER: number;
  AMBIENT_TEMPERATURE: number;
  MODULE_TEMPERATURE: number;
  IRRADIATION: number;
  hour?: number;
}

export interface AnomalyPredictionResult {
  status: "NORMAL" | "ABNORMAL";
  prediction: 1 | -1;
  anomaly_score: number;
  message: string;
  timestamp?: string;
  is_anomaly?: boolean;
}

export const apiClient = {
  baseUrl: API_URL,

  /**
   * Check backend health
   * GET /api/health
   */
  checkHealth: async () => {
    return apiFetch<{
      status: string;
      service: string;
      version?: string;
      model?: string;
      model_loaded?: boolean;
      uptime_seconds?: number;
      timestamp?: number;
      smtp_configured?: boolean;
    }>("/api/health");
  },

  /**
   * Request Email OTP
   * POST /api/auth/send-otp
   */
  sendOtp: async (email: string) => {
    return apiFetch<{ success: boolean; message: string }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Verify Email OTP
   * POST /api/auth/verify-otp
   */
  verifyOtp: async (email: string, otp: string) => {
    return apiFetch<{ success: boolean; message: string; email: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  /**
   * Generate MFA TOTP Secret
   * POST /api/auth/mfa/generate
   */
  generateMfa: async (email: string) => {
    return apiFetch<{ secret: string; otpauth_url: string; qr_code_data_url?: string }>(
      "/api/auth/mfa/generate",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      }
    );
  },

  /**
   * Verify MFA TOTP Code
   * POST /api/auth/mfa/verify
   */
  verifyMfa: async (secret: string, code: string) => {
    return apiFetch<{ success: boolean; message: string }>("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ secret, code }),
    });
  },

  /**
   * Dispatch Email Broadcast via SMTP
   * POST /api/admin/send-email
   */
  sendEmail: async (payload: SendEmailPayload) => {
    return apiFetch<{ success: boolean; sent_count: number; recipients: string[] }>(
      "/api/admin/send-email",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Dispatch Telegram Critical Alert
   * POST /api/alerts/telegram
   */
  sendTelegramAlert: async (payload: { message: string; severity?: string; node_id?: string }) => {
    return apiFetch<{ success: boolean; status: string; message?: string }>("/api/alerts/telegram", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Run Isolation Forest ML Anomaly Inference
   * POST /predict
   */
  predictAnomaly: async (data: SolarTelemetryPayload): Promise<AnomalyPredictionResult> => {
    const res = await apiFetch<AnomalyPredictionResult>("/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return {
      ...res,
      is_anomaly: res.prediction === -1 || res.status === "ABNORMAL",
    };
  },

  /**
   * Query Firebase RTDB 24/7 background sync status
   * GET /api/rtdb/status
   */
  getRtdbStatus: async () => {
    return apiFetch<{
      status: string;
      url: string;
      ticks: number;
      last_write: string | null;
      last_error: string | null;
      seeded: boolean;
    }>("/api/rtdb/status");
  },

  /**
   * Trigger manual Firebase RTDB seed
   * POST /api/rtdb/seed
   */
  seedRtdb: async () => {
    return apiFetch<{ success: boolean; status: string; last_error: string | null }>(
      "/api/rtdb/seed",
      { method: "POST" }
    );
  },
};

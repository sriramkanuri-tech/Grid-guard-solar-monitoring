import { mlService } from "./mlService";
import { telemetrySyncService } from "./telemetrySyncService";
import { rtdbService } from "../firebase/database";
import { alertService } from "./alertService";
import { apiClient } from "./apiClient";
import { getStoredUser } from "../firebase/auth";
import type { MLPredictionResponse, InferenceHistoryItem, AnomalyRecord } from "../types/ml";

export interface MLAutonomousState {
  latestResult: MLPredictionResponse | null;
  history: InferenceHistoryItem[];
  cycleCount: number;
  isAutonomous: boolean;
  serverStatus: "online" | "offline" | "checking";
  lastAnomalyTime: string | null;
  lastEmailSentTime: string | null;
  currentInputs: {
    dc: number;
    ac: number;
    ambientTemp: number;
    moduleTemp: number;
    irradiation: number;
    hour: number;
  };
}

class MLAutonomousService {
  private timer: number | null = null;
  private isRunning: boolean = false;
  private isAutonomous: boolean = true;
  private cycleCount: number = 0;
  private latestResult: MLPredictionResponse | null = null;
  private history: InferenceHistoryItem[] = [];
  private listeners: ((state: MLAutonomousState) => void)[] = [];
  private lastEmailAlertTimestamp: number = 0;
  private lastAnomalyTime: string | null = null;
  private lastEmailSentTime: string | null = null;
  private serverStatus: "online" | "offline" | "checking" = "checking";
  private isEvaluating: boolean = false;

  constructor() {
    // Initial state from cached history if available
    const cachedHistory = localStorage.getItem("gridguard_cache_ml_history");
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory);
        if (Array.isArray(parsed)) {
          this.history = parsed;
        }
      } catch {}
    }

    // Subscribe to RTDB ml_history to keep persistent history synced across all tabs/users
    rtdbService.subscribeToMlHistory((rtdbHistory) => {
      if (rtdbHistory && rtdbHistory.length > 0) {
        this.history = rtdbHistory;
        this.notifyListeners();
      }
    });

    // Check health of backend microservice
    this.checkServerHealth();

    // Automatically start the engine as soon as the app loads
    this.start();
  }

  public async checkServerHealth(): Promise<"online" | "offline"> {
    try {
      await mlService.checkHealth();
      this.serverStatus = "online";
    } catch {
      this.serverStatus = "offline";
    }
    this.notifyListeners();
    return this.serverStatus;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Immediately run an initial inference
    this.runInferenceCycle();

    // Run continuously every 3000ms (3 seconds)
    this.timer = window.setInterval(() => {
      if (this.isAutonomous) {
        this.runInferenceCycle();
      }
    }, 3000);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public setAutonomous(active: boolean) {
    this.isAutonomous = active;
    this.notifyListeners();
  }

  public async runInferenceCycle(
    customPayload?: {
      dc: number;
      ac: number;
      ambientTemp: number;
      moduleTemp: number;
      irradiation: number;
      hour: number;
    },
    forceEmailAlert: boolean = false
  ): Promise<MLPredictionResponse | null> {
    if (this.isEvaluating && !customPayload) return null;
    this.isEvaluating = true;

    if (customPayload || forceEmailAlert) {
      // Manual test or fault injection resets cooldown so email dispatches immediately
      this.lastEmailAlertTimestamp = 0;
    }

    const vector = telemetrySyncService.getTelemetryVector();
    const dc = customPayload ? customPayload.dc : vector.dcPower;
    const ac = customPayload ? customPayload.ac : vector.acPower;
    const ambientTemp = customPayload ? customPayload.ambientTemp : vector.ambientTemp;
    const moduleTemp = customPayload ? customPayload.moduleTemp : vector.moduleTemp;
    const irradiation = customPayload ? customPayload.irradiation : Number((vector.irradiance / 1000).toFixed(2));
    const hour = customPayload ? customPayload.hour : vector.hour;

    try {
      const result = await mlService.predict({
        DC_POWER: dc,
        AC_POWER: ac,
        AMBIENT_TEMPERATURE: ambientTemp,
        MODULE_TEMPERATURE: moduleTemp,
        IRRADIATION: irradiation,
        hour,
      });

      this.cycleCount++;
      this.latestResult = result;

      const historyRecord: InferenceHistoryItem = {
        id: `inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: result.timestamp || new Date().toLocaleTimeString(),
        inputs: {
          dc,
          ac,
          ambientTemp,
          moduleTemp,
          irradiation,
          hour,
        },
        prediction: result.prediction,
        status: result.status,
        anomalyScore: result.anomaly_score,
        message: result.message,
      };

      // 1. Prepend to local memory and cache
      this.history = [historyRecord, ...this.history.filter((h) => h.id !== historyRecord.id)].slice(0, 30);
      localStorage.setItem("gridguard_cache_ml_history", JSON.stringify(this.history));

      // 2. Persist inference history to Firebase Realtime Database
      rtdbService.saveMlInference(historyRecord).catch(() => {});

      // 3. IF ABNORMAL DETECTED: PERSIST ANOMALY DATA TO DATABASE & ALERT
      if (result.is_anomaly || result.status === "ABNORMAL") {
        this.lastAnomalyTime = new Date().toLocaleTimeString();
        await this.handleAbnormalDetection(result, {
          dc,
          ac,
          ambientTemp,
          moduleTemp,
          irradiation,
          hour,
        });
      }

      this.notifyListeners();
      return result;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[MLAutonomousService] Inference error:", err);
      }
      return null;
    } finally {
      this.isEvaluating = false;
    }
  }

  private async handleAbnormalDetection(
    result: MLPredictionResponse,
    inputs: { dc: number; ac: number; ambientTemp: number; moduleTemp: number; irradiation: number; hour: number }
  ) {
    const user = getStoredUser();
    const adminEmail = "sriramkanuri4@gmail.com";
    let allRegisteredEmails: string[] = [];
    try {
      allRegisteredEmails = await rtdbService.getAllUserEmails();
    } catch {}

    const rawEmails = [adminEmail, user?.email, ...allRegisteredEmails];
    const recipients = Array.from(
      new Set(
        rawEmails
          .filter((e): e is string => typeof e === "string" && e.includes("@") && e.trim().length > 4)
          .map((e) => e.trim().toLowerCase())
      )
    );
    const nowIso = new Date().toISOString();
    const anomalyId = `anom_${Date.now()}`;

    // 1. STORE ANOMALY RECORD IN FIREBASE RTDB (/anomalies)
    const anomalyPayload: Omit<AnomalyRecord, "id"> & { id: string } = {
      id: anomalyId,
      nodeId: "GG-NODE-01",
      timestamp: nowIso,
      status: "ABNORMAL",
      prediction: result.prediction,
      anomalyScore: result.anomaly_score,
      message: result.message,
      inputs,
      metrics: {
        acDcRatio: inputs.dc > 0 ? Number((inputs.ac / inputs.dc).toFixed(3)) : 0,
        tempDisparity: Number((inputs.moduleTemp - inputs.ambientTemp).toFixed(1)),
      },
      emailAlertSent: true,
      alertRecipient: recipients.join(", "),
      resolved: false,
      createdAt: nowIso,
    };

    try {
      await rtdbService.recordAnomaly(anomalyPayload);
    } catch (anomErr) {
      console.warn("[MLAutonomousService] Failed storing anomaly to RTDB:", anomErr);
    }

    // 2. CREATE CRITICAL ALERT IN FIREBASE RTDB (/alerts)
    try {
      const alertId = await alertService.createAlert({
        nodeId: "GG-NODE-01",
        type: "ANOMALY_DETECTION",
        severity: "CRITICAL",
        message: `ML Isolation Forest Alert: Abnormal generation disparity (Score: ${result.anomaly_score.toFixed(4)})`,
        value: result.anomaly_score,
        threshold: 0.0,
        resolved: false,
        status: "OPEN",
        acknowledged: false,
        timestamp: nowIso,
      });

      anomalyPayload.alertId = alertId;
    } catch (alertErr) {
      console.warn("[MLAutonomousService] Failed creating alert in RTDB:", alertErr);
    }

    // 3. LOG TO AUDIT TRAIL IN FIREBASE RTDB (/auditLogs)
    try {
      await rtdbService.logAuditEvent(
        "ML_ANOMALY_DETECTED",
        "GG-NODE-01",
        {
          anomalyId,
          score: result.anomaly_score,
          dcPower: inputs.dc,
          acPower: inputs.ac,
          ambientTemp: inputs.ambientTemp,
          moduleTemp: inputs.moduleTemp,
          irradiation: inputs.irradiation,
          status: "ABNORMAL",
        },
        user?.uid || "system",
        recipients.join(", ")
      );
    } catch (auditErr) {
      console.warn("[MLAutonomousService] Failed writing audit log:", auditErr);
    }

    // 4. MARK NODE STATUS AS CRITICAL IN RTDB
    try {
      await rtdbService.updateNodeStatus("GG-NODE-01", "CRITICAL");
    } catch {}

    // 5. DISPATCH EMAIL ADVISORY TO RECIPIENTS (Protected by 25s cooldown)
    const now = Date.now();
    if (now - this.lastEmailAlertTimestamp >= 25000) {
      this.lastEmailAlertTimestamp = now;
      this.lastEmailSentTime = new Date().toLocaleTimeString();

      const subject = `🚨 CRITICAL ALERT: Solar Anomaly Detected on Node GG-NODE-01`;
      const plainMessage = `GRID GUARD AUTONOMOUS ISOLATION FOREST ADVISORY
==================================================
Anomaly Alert: Abnormal Generation Disparity Detected
Monitoring Node: GG-NODE-01
Timestamp: ${new Date().toLocaleString()}

TELEMETRY VECTOR:
• DC String Output: ${inputs.dc} W
• Inverter AC Generation: ${inputs.ac} W
• Inverter Efficiency Ratio: ${((inputs.ac / (inputs.dc || 1)) * 100).toFixed(1)}%
• Module Temperature: ${inputs.moduleTemp} °C
• Ambient Temperature: ${inputs.ambientTemp} °C
• Solar Irradiance: ${inputs.irradiation} kW/m²

ISOLATION FOREST INFERENCE:
• Status: ABNORMAL (Prediction Vector: -1)
• Outlier Score: ${result.anomaly_score.toFixed(5)}
• Diagnosis: ${result.message}

RECOMMENDED ACTION:
1. Inspect inverter DC string fuses and MPPT tracking efficiency.
2. Check module junction thermal sensors for localized hotspot degradation.
3. Review live telemetry in the Grid Guard Control Console: https://gridguardsolarmonitoring.web.app

Dispatched automatically by Grid Guard ML Autonomous Engine to: ${recipients.join(", ")}`;

      const htmlMessage = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; text-align: center;">
          <span style="display:inline-block; font-size: 32px; margin-bottom: 8px;">🚨</span>
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">CRITICAL SOLAR ANOMALY DETECTED</h1>
          <p style="margin: 4px 0 0 0; color: #fecaca; font-size: 13px;">Node GG-NODE-01 &bull; Autonomous Isolation Forest Engine</p>
        </div>
        <div style="padding: 24px;">
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Telemetry Vector</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="color: #94a3b8; padding: 4px 0;">DC String Output:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">${inputs.dc} W</td></tr>
              <tr><td style="color: #94a3b8; padding: 4px 0;">Inverter AC Generation:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">${inputs.ac} W</td></tr>
              <tr><td style="color: #94a3b8; padding: 4px 0;">Efficiency Ratio:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">${((inputs.ac / (inputs.dc || 1)) * 100).toFixed(1)}%</td></tr>
              <tr><td style="color: #94a3b8; padding: 4px 0;">Module Temperature:</td><td style="color: #ef4444; font-weight: bold; text-align: right;">${inputs.moduleTemp} °C</td></tr>
              <tr><td style="color: #94a3b8; padding: 4px 0;">Ambient Temperature:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">${inputs.ambientTemp} °C</td></tr>
              <tr><td style="color: #94a3b8; padding: 4px 0;">Solar Irradiance:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">${inputs.irradiation} kW/m²</td></tr>
            </table>
          </div>
          <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="color: #f87171; font-weight: bold; font-size: 14px; margin-bottom: 6px;">Evaluation: ABNORMAL (Score: ${result.anomaly_score.toFixed(5)})</div>
            <div style="color: #cbd5e1; font-size: 13px;">${result.message}</div>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://gridguardsolarmonitoring.web.app" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Monitoring Console</a>
          </div>
        </div>
        <div style="background: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
          Stored in Firebase RTDB &bull; Dispatched to ${recipients.join(", ")} &bull; Grid Guard Solar Monitoring
        </div>
      </div>`;

      apiClient
        .sendEmail({
          recipients,
          subject,
          message: plainMessage,
          html_message: htmlMessage,
        })
        .then((res) => {
          console.log("[MLAutonomousService] Anomaly email alert dispatched:", res);
        })
        .catch((emailErr) => {
          console.warn("[MLAutonomousService] Automated email alert failed:", emailErr);
        });
    }
  }

  public subscribe(callback: (state: MLAutonomousState) => void): () => void {
    callback(this.getState());
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public getState(): MLAutonomousState {
    const vector = telemetrySyncService.getTelemetryVector();
    return {
      latestResult: this.latestResult,
      history: this.history,
      cycleCount: this.cycleCount,
      isAutonomous: this.isAutonomous,
      serverStatus: this.serverStatus,
      lastAnomalyTime: this.lastAnomalyTime,
      lastEmailSentTime: this.lastEmailSentTime,
      currentInputs: {
        dc: vector.dcPower,
        ac: vector.acPower,
        ambientTemp: vector.ambientTemp,
        moduleTemp: vector.moduleTemp,
        irradiation: Number((vector.irradiance / 1000).toFixed(2)),
        hour: vector.hour,
      },
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn("[MLAutonomousService] Error notifying listener:", err);
      }
    });
  }

  public triggerTestAnomaly() {
    this.lastEmailAlertTimestamp = 0; // reset cooldown for manual test
    telemetrySyncService.triggerAnomalySimulation(8, "Manual Inverter String Disparity Simulation");
    this.runInferenceCycle(undefined, true);
  }
}

export const mlAutonomousService = new MLAutonomousService();

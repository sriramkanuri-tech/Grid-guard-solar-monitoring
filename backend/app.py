import os
import sys
import time
import math
import threading
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

# Ensure UTF-8 output encoding on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import joblib  # type: ignore[import-untyped]
import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from backend.database import (
    SessionLocal,
    get_db,
    initialize_database_data,
    User,
    UserSession,
    SolarNode,
    Sensor,
    SensorReading,
    GridTelemetry,
    EnergyAnalytics,
    BatteryAnalytics,
    MLDetection,
    Alert,
    AuditLog,
    Presence,
    SystemStatus,
    engine,
    text,
)
from sqlalchemy.orm import Session

# Load environment variables
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

# Model Loading
model: Any = None
features: List[str] = []

model_candidates = [
    Path(__file__).resolve().parent / "grid_guard_solar_model.joblib",
    ROOT_DIR / "ml-server" / "grid_guard_solar_model.joblib",
    ROOT_DIR / "grid_guard_solar_model.joblib",
]

for p in model_candidates:
    if p.exists():
        try:
            bundle = joblib.load(p)
            model = bundle["model"]
            features = bundle["features"]
            print(f"[ML] Successfully loaded model from {p}")
            break
        except Exception as e:
            print(f"[ML Warning] Failed loading model from {p}: {e}")

# In-memory OTP storage: { email: { "otp": "123456", "expires_at": float, "attempts": int } }
otp_store: Dict[str, Dict[str, Any]] = {}

# Telegram debouncing cache: { alert_hash: last_sent_timestamp }
telegram_cooldown_cache: Dict[str, float] = {}

# Telemetry live cache and ML history cache
latest_telemetry_cache: Dict[str, Any] = {}
ml_inference_history: List[Dict[str, Any]] = []
last_24h_email_sent: float = 0.0
START_TIME = time.time()

# Background threads initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure PostgreSQL tables are populated with initial data
    try:
        initialize_database_data()
        print("[PostgreSQL 18] Database initialized and verified.")
    except Exception as e:
        print(f"[PostgreSQL 18 Init Warning] {e}")

    # Launch background worker threads
    t1 = threading.Thread(target=telemetry_background_worker, daemon=True, name="telemetry_worker")
    t2 = threading.Thread(target=autonomous_ml_evaluator_24h, daemon=True, name="ml_evaluator")
    t3 = threading.Thread(target=queue_dispatcher_worker, daemon=True, name="queue_dispatcher")
    t1.start()
    t2.start()
    t3.start()

    yield

app = FastAPI(
    title="Grid Guard Solar Monitoring API",
    description="PostgreSQL 18 Persistent Backend & Isolation Forest ML Anomaly Detection Service",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS configuration
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "https://gridguardsolarmonitoring.web.app",
    "https://gridguardsolarmonitoring.firebaseapp.com",
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    custom_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
    for origin in custom_origins:
        if origin not in default_origins:
            default_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/gridguardsolarmonitoring(-[a-z0-9]+)?\.(web\.app|firebaseapp\.com)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_header(request: Request, call_next):
    if request.method == "OPTIONS":
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# ==========================================================
# PYDANTIC SCHEMAS
# ==========================================================
class SolarReading(BaseModel):
    DC_POWER: float
    AC_POWER: float
    AMBIENT_TEMPERATURE: float
    MODULE_TEMPERATURE: float
    IRRADIATION: float
    hour: float = 12.0

class SendEmailPayload(BaseModel):
    recipients: List[str]
    subject: str
    message: str
    html_message: Optional[str] = None
    sender_name: Optional[str] = "Grid Guard Admin"

SYSTEM_SETTINGS: Dict[str, Any] = {
    "maintenanceMode": False,
    "stopMlDetectionMails": False,
}

def load_system_settings_from_db():
    try:
        db = SessionLocal()
        rows = db.query(SystemStatus).order_by(SystemStatus.timestamp.desc()).limit(20).all()
        for r in rows:
            if r.additional_data:
                if "stopMlDetectionMails" in r.additional_data:
                    SYSTEM_SETTINGS["stopMlDetectionMails"] = bool(r.additional_data["stopMlDetectionMails"])
                    break
                elif "stop_ml_detection_mails" in r.additional_data:
                    SYSTEM_SETTINGS["stopMlDetectionMails"] = bool(r.additional_data["stop_ml_detection_mails"])
                    break
        for r in rows:
            if r.additional_data and "maintenanceMode" in r.additional_data:
                SYSTEM_SETTINGS["maintenanceMode"] = bool(r.additional_data["maintenanceMode"])
                break
        db.close()
    except Exception as e:
        print(f"[Settings Load Notice] {e}")

load_system_settings_from_db()

class SendOtpPayload(BaseModel):
    email: str
    otp: Optional[str] = None

class VerifyOtpPayload(BaseModel):
    email: str
    otp: str

class MfaGeneratePayload(BaseModel):
    email: str

class MfaVerifyPayload(BaseModel):
    secret: str
    code: str

class TelegramAlertPayload(BaseModel):
    message: str
    severity: str = "CRITICAL"
    node_id: Optional[str] = "GG-NODE-01"
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

class TelemetryPushPayload(BaseModel):
    nodeId: str = "GG-NODE-01"
    voltage: float
    current: float
    power: float
    energy: float
    temperature: float
    irradiance: float
    frequency: float = 50.02
    powerFactor: float = 0.98
    status: str = "ONLINE"

class UserCreateOrUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: Optional[bool] = None
    firebase_uid: Optional[str] = None
    isAdmin: Optional[bool] = None
    status: Optional[str] = None

class FirebaseSyncPayload(BaseModel):
    firebase_uid: str
    email: str
    name: Optional[str] = None

class NodeCreateOrUpdatePayload(BaseModel):
    nodeId: str
    name: str
    location: Optional[str] = None
    status: Optional[str] = "ONLINE"
    rated_output_kw: Optional[float] = 5.0
    connection_protocol: Optional[str] = "MQTT"
    ip_address: Optional[str] = None
    device_type: Optional[str] = "Solar Array"
    firmware_version: Optional[str] = "v2.4.1-prod"

class SensorCreateOrUpdatePayload(BaseModel):
    sensor_id: str
    node_id: Optional[str] = "GG-NODE-01"
    name: Optional[str] = None
    sensor_type: Optional[str] = "inverter"
    location: Optional[str] = None
    status: Optional[str] = "normal"
    unit: Optional[str] = "kW"
    power: Optional[float] = None
    voltage: Optional[float] = None
    current: Optional[float] = None
    temperature: Optional[float] = None

class AlertCreatePayload(BaseModel):
    nodeId: Optional[str] = "GG-NODE-01"
    type: str = "system"
    severity: str = "INFO"
    title: Optional[str] = None
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None

class AuditLogPayload(BaseModel):
    action: str
    target: Optional[str] = "platform"
    metadata: Optional[Dict[str, Any]] = None
    actorUid: Optional[str] = None
    actorEmail: Optional[str] = None

class PresencePayload(BaseModel):
    user_email: str
    session_id: Optional[str] = None
    online: bool = True

class SystemSettingsPayload(BaseModel):
    maintenanceMode: Optional[bool] = None
    stopMlDetectionMails: Optional[bool] = None

# ==========================================================
# SMTP EMAIL HELPER
# ==========================================================
def send_smtp_email(to_addrs: List[str], subject: str, text_content: str, html_content: Optional[str] = None) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASS", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "Grid Guard Solar <sriramkanuri45@gmail.com>")

    clean_addrs = [str(a).strip() for a in to_addrs if a and "@" in str(a)]
    if not clean_addrs:
        print("[SMTP Error] No valid email recipients specified.", flush=True)
        return False

    clean_addrs = list(dict.fromkeys(clean_addrs))

    if not smtp_user or not smtp_pass:
        print("[SMTP Error] SMTP_USER or SMTP_PASS not set in environment.", flush=True)
        return False

    server = None
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = Header(smtp_from, "utf-8")
        msg["To"] = ", ".join(clean_addrs)

        part1 = MIMEText(text_content, "plain", "utf-8")
        msg.attach(part1)

        if html_content:
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part2)

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=8)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, clean_addrs, msg.as_string())
        print(f"[SMTP Success] Email sent to {clean_addrs}: {subject}", flush=True)
        return True
    except Exception as e:
        print(f"[SMTP Exception] Error sending email: {e}", flush=True)
        return False
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass

# ==========================================================
# BACKGROUND WORKERS
# ==========================================================
def telemetry_background_worker():
    """
    Autonomous background loop: generates 1-second dynamic solar telemetry
    and persists directly to PostgreSQL 18 tables:
    - sensor_readings
    - grid_telemetry
    - energy_analytics
    - battery_analytics
    - system_status
    - solar_nodes (status & last_seen)
    """
    tick_count = 0
    energy_acc = 45.2
    time.sleep(2)

    while True:
        try:
            tick_count += 1
            t = tick_count * 0.1
            bus_voltage = round(230.4 + math.sin(t * 0.7) * 0.6 + (secrets.randbelow(100) / 100.0 - 0.5) * 0.4, 1)
            power_kw = round(4.82 + math.sin(t * 0.5) * 0.15 + (secrets.randbelow(100) / 100.0 - 0.5) * 0.08, 2)
            energy_acc = round(energy_acc + (power_kw / 3600.0), 3)
            power_factor = 0.985
            current_a = round((power_kw * 1000.0) / (bus_voltage * power_factor), 1)
            base_temp = round(34.0 + math.sin(t * 0.2) * 1.5, 1)
            irradiance = round(max(750, min(1000, 860 + math.sin(t * 0.3) * 30)))
            frequency = round(50.02 + math.sin(t * 1.1) * 0.02, 2)
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            now_iso = now_dt.isoformat()

            # Anomaly simulation: periodic generation disparity (cycles 60-68 every 90s)
            is_anomaly_tick = (tick_count > 15 and (tick_count % 90 >= 60 and tick_count % 90 <= 68))
            if is_anomaly_tick:
                dc_power_w = round(5820.0 + math.sin(t) * 150.0, 1)
                ac_power_w = round(440.0 + math.cos(t) * 40.0, 1)
                module_temp = round(88.5 + (secrets.randbelow(20) / 10.0), 1)
                ambient_temp = 32.0
                node_status = "CRITICAL"
                effective_kw = round(ac_power_w / 1000.0, 2)
                efficiency = 7.6
            else:
                dc_power_w = round(power_kw * 1000.0 * 1.15, 1)
                ac_power_w = round(power_kw * 1000.0, 1)
                module_temp = round(base_temp + 11.2, 1)
                ambient_temp = round(base_temp - 5.5, 1)
                node_status = "ONLINE"
                effective_kw = power_kw
                efficiency = 95.2

            telemetry_data = {
                "nodeId": "GG-NODE-01",
                "timestamp": now_iso,
                "voltage": bus_voltage,
                "current": current_a,
                "power": effective_kw,
                "energy": energy_acc,
                "temperature": module_temp,
                "irradiance": irradiance,
                "efficiency": efficiency,
                "frequency": frequency,
                "powerFactor": power_factor,
                "status": node_status,
                "dc_power": dc_power_w,
                "ac_power": ac_power_w,
                "ambient_temperature": ambient_temp,
                "module_temperature": module_temp,
            }

            latest_telemetry_cache.update(telemetry_data)

            # Persist to PostgreSQL every 2 seconds or on anomaly
            if tick_count % 2 == 0 or is_anomaly_tick:
                db = SessionLocal()
                try:
                    # Find primary node
                    primary_node = db.query(SolarNode).filter(SolarNode.node_id == "GG-NODE-01").first()
                    node_uuid = primary_node.id if primary_node else None

                    # 1. Update solar_nodes status & last seen
                    if primary_node:
                        primary_node.status = node_status
                        primary_node.last_seen = now_dt
                        primary_node.updated_at = now_dt

                    # 2. Insert SensorReading
                    reading = SensorReading(
                        node_id=node_uuid,
                        timestamp=now_dt,
                        power_kw=effective_kw,
                        voltage_v=bus_voltage,
                        current_a=current_a,
                        temperature_c=module_temp,
                        humidity_percent=55.0,
                        pressure_hpa=1013.25,
                        irradiance_w_m2=float(irradiance),
                        frequency_hz=frequency,
                        power_factor=power_factor,
                        energy_kwh=energy_acc,
                        status=node_status,
                        additional_data={
                            "efficiency": efficiency,
                            "dc_power_w": dc_power_w,
                            "ac_power_w": ac_power_w,
                        }
                    )
                    db.add(reading)

                    # 3. Insert GridTelemetry
                    grid_rec = GridTelemetry(
                        node_id=node_uuid,
                        timestamp=now_dt,
                        grid_voltage_v=bus_voltage,
                        grid_current_a=current_a,
                        grid_frequency_hz=frequency,
                        power_factor=power_factor,
                        phase_voltage=bus_voltage,
                        phase_current=current_a,
                        interlock_state="CLOSED" if node_status == "ONLINE" else "TRIPPED",
                        grid_status="SYNCHRONIZED" if node_status == "ONLINE" else "DISTURBANCE",
                    )
                    db.add(grid_rec)

                    # 4. Insert EnergyAnalytics
                    energy_rec = EnergyAnalytics(
                        node_id=node_uuid,
                        timestamp=now_dt,
                        solar_power_kw=effective_kw,
                        energy_generated_kwh=energy_acc,
                        average_power_kw=round(effective_kw * 0.95, 2),
                        peak_power_kw=5.2,
                        grid_voltage_v=bus_voltage,
                        battery_soc_percent=78.5,
                        inverter_efficiency_percent=efficiency,
                        period_type="LIVE_STREAM",
                        created_at=now_dt,
                    )
                    db.add(energy_rec)

                    # 5. Insert BatteryAnalytics
                    battery_rec = BatteryAnalytics(
                        node_id=node_uuid,
                        timestamp=now_dt,
                        battery_soc_percent=78.5,
                        battery_voltage_v=48.2,
                        battery_current_a=15.4,
                        battery_power_kw=0.74,
                        charge_rate=1.2,
                        discharge_rate=0.0,
                        battery_temperature_c=27.4,
                        battery_health_percent=98.5,
                        operating_state="FLOAT_CHARGE",
                        created_at=now_dt,
                    )
                    db.add(battery_rec)

                    # 6. Update system_status periodically (every ~10s)
                    if tick_count % 10 == 0:
                        status_rec = SystemStatus(
                            timestamp=now_dt,
                            hardware_status="ONLINE" if node_status == "ONLINE" else "FAULT",
                            api_status="ONLINE",
                            database_status="POSTGRESQL_18_ACTIVE",
                            ml_server_status="ARMED",
                            active_nodes=db.query(SolarNode).filter(SolarNode.status != "offline").count(),
                            active_sensors=db.query(Sensor).filter(Sensor.status != "offline").count(),
                            system_state=node_status if not SYSTEM_SETTINGS.get("maintenanceMode") else "MAINTENANCE",
                            additional_data={
                                "ticks": tick_count,
                                "latest_power": effective_kw,
                                "latest_efficiency": efficiency,
                                "stopMlDetectionMails": SYSTEM_SETTINGS.get("stopMlDetectionMails", False),
                                "stop_ml_detection_mails": SYSTEM_SETTINGS.get("stopMlDetectionMails", False),
                                "maintenanceMode": SYSTEM_SETTINGS.get("maintenanceMode", False),
                                "version": "2.1.0-prod",
                            }
                        )
                        db.add(status_rec)

                    db.commit()
                except Exception as db_err:
                    db.rollback()
                    print(f"[PostgreSQL Telemetry Sync Error] {db_err}")
                finally:
                    db.close()

        except Exception as e:
            print(f"[Telemetry Worker Loop Error] {e}")

        time.sleep(1.0)


def autonomous_ml_evaluator_24h():
    """
    Dedicated 24/7 autonomous background evaluator.
    Continuously executes Isolation Forest inference on solar inverter telemetry.
    When generation disparity is flagged (-1):
    1. Persists anomaly in PostgreSQL table ml_detections
    2. Raises critical alert in PostgreSQL table alerts
    3. Flags node status as CRITICAL
    4. Gathers all registered operator emails from PostgreSQL users table
    5. Dispatches diagnostic HTML advisory email via SMTP (if not stopped)
    """
    global last_24h_email_sent
    print("[24/7 ML Engine] Dedicated 24/7 Autonomous Isolation Forest evaluator running with PostgreSQL 18.", flush=True)

    time.sleep(5)

    while True:
        try:
            if model is None or not features:
                time.sleep(4)
                continue

            tel = latest_telemetry_cache.copy()
            if not tel:
                time.sleep(2)
                continue

            dc_power = float(tel.get("dc_power", 0))
            ac_power = float(tel.get("ac_power", 0))
            amb_temp = float(tel.get("ambient_temperature", 28.0))
            mod_temp = float(tel.get("module_temperature", 34.0))
            irradiance = float(tel.get("irradiance", 850.0))
            irrad_kw = max(0.01, irradiance / 1000.0)

            now_struct = time.localtime()
            hour = float(now_struct.tm_hour + now_struct.tm_min / 60.0)

            df = pd.DataFrame([{
                "DC_POWER": dc_power,
                "AC_POWER": ac_power,
                "AMBIENT_TEMPERATURE": amb_temp,
                "MODULE_TEMPERATURE": mod_temp,
                "IRRADIATION": irrad_kw,
            }])

            df["HOUR_SIN"] = np.sin(2 * np.pi * hour / 24)
            df["HOUR_COS"] = np.cos(2 * np.pi * hour / 24)
            df["AC_DC_RATIO"] = (ac_power / dc_power) if dc_power > 1 else 0
            df["POWER_PER_IRRADIANCE"] = (ac_power / irrad_kw) if irrad_kw > 0.05 else 0
            df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

            pred = int(model.predict(df[features])[0])
            score = float(model.decision_function(df[features])[0])
            is_anomaly = (pred == -1 or score < 0)

            now_dt = datetime.datetime.now(datetime.timezone.utc)
            now_iso = now_dt.isoformat()
            inf_id = f"inf_24h_{int(time.time() * 1000)}"

            # In-memory history for fast rendering
            inf_record = {
                "id": inf_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "inputs": {
                    "dc": round(dc_power, 1),
                    "ac": round(ac_power, 1),
                    "ambientTemp": round(amb_temp, 1),
                    "moduleTemp": round(mod_temp, 1),
                    "irradiation": round(irrad_kw, 2),
                    "hour": round(hour, 2),
                },
                "prediction": pred,
                "status": "ABNORMAL" if is_anomaly else "NORMAL",
                "anomalyScore": round(score, 5),
                "message": "Isolation Forest flagged abnormal generation disparity" if is_anomaly else "Solar inverter operating within nominal distribution",
            }

            ml_inference_history.insert(0, inf_record)
            if len(ml_inference_history) > 100:
                ml_inference_history.pop()

            if is_anomaly:
                now_epoch = time.time()
                db = SessionLocal()
                try:
                    primary_node = db.query(SolarNode).filter(SolarNode.node_id == "GG-NODE-01").first()
                    node_uuid = primary_node.id if primary_node else None

                    # 1. Insert into ml_detections
                    detection = MLDetection(
                        node_id=node_uuid,
                        timestamp=now_dt,
                        dc_power_w=dc_power,
                        ac_power_w=ac_power,
                        ambient_temperature_c=amb_temp,
                        module_temperature_c=mod_temp,
                        irradiation_w_m2=irradiance,
                        anomaly_score=round(score, 5),
                        prediction=pred,
                        detection_status="ABNORMAL",
                        model_name="Isolation Forest",
                        model_version="v2.0.0",
                        confidence=round(abs(score), 4),
                        created_at=now_dt,
                    )
                    db.add(detection)
                    db.flush()

                    # 2. Insert into alerts
                    alert = Alert(
                        node_id=node_uuid,
                        ml_detection_id=detection.id,
                        alert_type="ANOMALY_DETECTION",
                        severity="CRITICAL",
                        title="Solar Array Generation Disparity",
                        message=f"ML Isolation Forest Alert: Abnormal generation disparity (Score: {score:.4f})",
                        value=round(score, 4),
                        threshold=0.0,
                        status="ACTIVE",
                        created_at=now_dt,
                    )
                    db.add(alert)

                    # Update node status
                    if primary_node:
                        primary_node.status = "CRITICAL"
                        primary_node.updated_at = now_dt

                    # Check system settings for mail suppression
                    stop_ml_mails = bool(SYSTEM_SETTINGS.get("stopMlDetectionMails", False))
                    if not stop_ml_mails:
                        latest_sys = db.query(SystemStatus).order_by(SystemStatus.timestamp.desc()).first()
                        if latest_sys and latest_sys.additional_data:
                            stop_ml_mails = bool(latest_sys.additional_data.get("stopMlDetectionMails", False))

                    db.commit()

                    # Email Broadcast (throttled to 60s cooldown)
                    if now_epoch - last_24h_email_sent >= 60.0:
                        last_24h_email_sent = now_epoch

                        # Query all operator emails from PostgreSQL users table
                        users = db.query(User).filter(User.is_active == True).all()
                        recipients = [u.email for u in users if u.email and "@" in u.email]
                        admin_email = os.getenv("ADMIN_EMAIL", "sriramkanuri4@gmail.com")
                        if admin_email not in recipients:
                            recipients.append(admin_email)

                        recipients = list(dict.fromkeys([str(r).strip().lower() for r in recipients]))

                        if stop_ml_mails:
                            print(f"[24/7 ML Engine] ABNORMAL condition flagged (Score: {score:.5f}), but ML Detection emails are STOPPED in settings. Email suppressed.", flush=True)
                        else:
                            print(f"[24/7 ML Engine] ABNORMAL condition flagged (Score: {score:.5f}). Notifying operators in PostgreSQL: {recipients}", flush=True)
                            subject = "🚨 CRITICAL ALERT: Solar Anomaly Detected on Node GG-NODE-01"
                            plain_msg = f"""GRID GUARD 24/7 AUTONOMOUS ISOLATION FOREST ADVISORY
==================================================
Anomaly Alert: Abnormal Generation Disparity Detected
Monitoring Node: GG-NODE-01
Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

TELEMETRY VECTOR:
• DC String Output: {dc_power:.1f} W
• Inverter AC Generation: {ac_power:.1f} W
• Inverter Efficiency Ratio: {((ac_power / (dc_power or 1)) * 100):.1f}%
• Module Temperature: {mod_temp:.1f} °C
• Ambient Temperature: {amb_temp:.1f} °C
• Solar Irradiance: {irradiance:.0f} W/m²

ISOLATION FOREST INFERENCE:
• Status: ABNORMAL (Prediction Vector: -1)
• Outlier Score: {score:.5f}
• Diagnosis: Isolation Forest flagged abnormal generation disparity

RECOMMENDED ACTION:
1. Inspect inverter DC string fuses and MPPT tracking efficiency.
2. Check module junction thermal sensors for localized hotspot degradation.
3. Review live telemetry in the Grid Guard Control Console: https://gridguardsolarmonitoring.web.app

Stored in PostgreSQL 18 &bull; Dispatched to: {', '.join(recipients)}"""

                            html_msg = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; text-align: center;">
    <span style="display:inline-block; font-size: 32px; margin-bottom: 8px;">🚨</span>
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">CRITICAL SOLAR ANOMALY DETECTED</h1>
    <p style="margin: 4px 0 0 0; color: #fecaca; font-size: 13px;">Node GG-NODE-01 &bull; 24/7 Autonomous Isolation Forest Engine</p>
  </div>
  <div style="padding: 24px;">
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 12px 0; color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Telemetry Vector</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr><td style="color: #94a3b8; padding: 4px 0;">DC String Output:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">{dc_power:.1f} W</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Inverter AC Generation:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">{ac_power:.1f} W</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Efficiency Ratio:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">{((ac_power / (dc_power or 1)) * 100):.1f}%</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Module Temperature:</td><td style="color: #ef4444; font-weight: bold; text-align: right;">{mod_temp:.1f} °C</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Ambient Temperature:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">{amb_temp:.1f} °C</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Solar Irradiance:</td><td style="color: #f8fafc; font-weight: bold; text-align: right;">{irradiance:.0f} W/m²</td></tr>
      </table>
    </div>
    <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="color: #f87171; font-weight: bold; font-size: 14px; margin-bottom: 6px;">Evaluation: ABNORMAL (Score: {score:.5f})</div>
      <div style="color: #cbd5e1; font-size: 13px;">Isolation Forest flagged abnormal generation disparity</div>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://gridguardsolarmonitoring.web.app" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Monitoring Console</a>
    </div>
  </div>
  <div style="background: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
    Stored in PostgreSQL 18 &bull; Dispatched to {', '.join(recipients)} &bull; Grid Guard Solar Monitoring
  </div>
</div>"""
                            send_smtp_email(recipients, subject, plain_msg, html_msg)

                except Exception as ml_db_err:
                    db.rollback()
                    print(f"[ML DB Record Error] {ml_db_err}")
                finally:
                    db.close()

        except Exception as e:
            print(f"[24/7 ML Loop Error]: {e}", flush=True)

        time.sleep(3.0)


def queue_dispatcher_worker():
    """Lightweight queue worker for asynchronous email tasks."""
    print("[Queue Dispatcher] Background worker started.", flush=True)
    while True:
        time.sleep(5)

# ==========================================================
# REST API ENDPOINTS
# ==========================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Grid Guard Solar Monitoring API",
        "database": "PostgreSQL 18 (gridguardsolarmonitoring)",
        "version": "2.1.0",
        "model_loaded": model is not None,
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db_connected = False
    table_counts = {}
    try:
        res = db.execute(text("SELECT 1;")).fetchone()
        db_connected = (res is not None and res[0] == 1)
        table_counts["users"] = db.query(User).count()
        table_counts["nodes"] = db.query(SolarNode).count()
        table_counts["sensors"] = db.query(Sensor).count()
        table_counts["sensor_readings"] = db.query(SensorReading).count()
        table_counts["alerts"] = db.query(Alert).count()
    except Exception as e:
        print(f"[Health Check DB Error] {e}")

    return {
        "status": "ok" if db_connected else "degraded",
        "service": "Grid Guard API",
        "version": "2.1.0",
        "database": {
            "type": "PostgreSQL 18",
            "name": "gridguardsolarmonitoring",
            "connected": db_connected,
            "tables": table_counts,
        },
        "model": "Isolation Forest" if model is not None else "unavailable",
        "model_loaded": model is not None,
        "uptime_seconds": int(time.time() - START_TIME),
        "timestamp": int(time.time()),
        "smtp_configured": bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS")),
    }


# ==========================================================
# USERS ENDPOINTS (PostgreSQL 'users' table)
# ==========================================================
@app.get("/api/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.asc()).all()
    result = []
    for u in users:
        result.append({
            "id": str(u.id),
            "uid": str(u.id),
            "firebase_uid": u.firebase_uid,
            "name": u.name or u.email.split("@")[0],
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "isAdmin": (u.role == "admin"),
            "status": "active" if u.is_active else "disabled",
            "is_active": u.is_active,
            "profile_image": u.profile_image,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
            "lastSeen": u.updated_at.isoformat() if u.updated_at else None,
            "lastLogin": u.last_login_at.isoformat() if u.last_login_at else None,
        })
    return result


@app.get("/api/users/profile")
def get_user_profile(
    email: Optional[str] = None,
    uid: Optional[str] = None,
    firebase_uid: Optional[str] = None,
    db: Session = Depends(get_db)
):
    user = None
    if email:
        clean_email = email.strip().lower()
        user = db.query(User).filter(User.email.ilike(clean_email)).first()
    elif firebase_uid:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    elif uid:
        try:
            uuid_obj = uuid.UUID(uid)
            user = db.query(User).filter(User.id == uuid_obj).first()
        except Exception:
            user = db.query(User).filter(User.firebase_uid == uid).first()

    if not user:
        return None

    return {
        "id": str(user.id),
        "uid": str(user.id),
        "firebase_uid": user.firebase_uid,
        "name": user.name or user.email.split("@")[0],
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "isAdmin": (user.role == "admin"),
        "status": "active" if user.is_active else "disabled",
        "is_active": user.is_active,
        "profile_image": user.profile_image,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "lastSeen": user.updated_at.isoformat() if user.updated_at else None,
        "lastLogin": user.last_login_at.isoformat() if user.last_login_at else None,
    }


@app.post("/api/users")
def create_or_update_user(payload: UserCreateOrUpdatePayload, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    clean_fb_uid = payload.firebase_uid.strip() if (payload.firebase_uid and str(payload.firebase_uid).strip()) else None

    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if not user and clean_fb_uid:
        user = db.query(User).filter(User.firebase_uid == clean_fb_uid).first()

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    is_new_user = (user is None)

    if user:
        if payload.name:
            user.name = payload.name
        if payload.phone is not None:
            user.phone = payload.phone
        if payload.isAdmin is True or (payload.role and str(payload.role).lower() == "admin"):
            user.role = "admin"
        elif payload.isAdmin is False or (payload.role and str(payload.role).lower() in ("member", "user")):
            user.role = "member"
        if payload.status:
            user.is_active = (str(payload.status).lower() == "active")
        elif payload.is_active is not None:
            user.is_active = bool(payload.is_active)
        if payload.profile_image is not None:
            user.profile_image = payload.profile_image
        if clean_fb_uid:
            user.firebase_uid = clean_fb_uid
        user.updated_at = now_dt
    else:
        role = "admin" if (payload.isAdmin or (payload.role and str(payload.role).lower() == "admin") or clean_email == "sriramkanuri4@gmail.com") else "member"
        is_active = True
        if payload.status:
            is_active = (str(payload.status).lower() == "active")
        elif payload.is_active is not None:
            is_active = bool(payload.is_active)
        user = User(
            name=payload.name or clean_email.split("@")[0],
            email=clean_email,
            phone=payload.phone,
            role=role,
            profile_image=payload.profile_image,
            is_active=is_active,
            firebase_uid=clean_fb_uid,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # When a new operator account registers, send an onboarding confirmation email asynchronously
    if is_new_user:
        def send_welcome_async():
            w_subj = "Welcome to Grid Guard Solar Monitoring"
            w_text = f"Hello {user.name or clean_email},\n\nYour operator account has been registered on the Grid Guard Solar Monitoring platform.\nDesignated Role: {user.role.upper()}\nAccess Console: https://gridguardsolarmonitoring.web.app\n\nBest regards,\nGrid Guard Security Team"
            w_html = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #030712; color: #f8fafc; padding: 28px; border-radius: 12px; border: 1px solid #1e293b;">
              <h2 style="color: #a3e635; margin-top: 0; font-size: 20px;">Welcome to Grid Guard</h2>
              <p style="color: #e2e8f0; font-size: 14px;">Hello <strong>{user.name or clean_email}</strong>,</p>
              <p style="color: #cbd5e1; font-size: 14px;">Your operator profile has been saved to the PostgreSQL 18 database.</p>
              <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin: 16px 0;">
                <div style="color: #94a3b8; font-size: 12px;">Registered Email: <span style="color: #38bdf8; font-weight: bold;">{clean_email}</span></div>
                <div style="color: #94a3b8; font-size: 12px; margin-top: 6px;">Designated Role: <span style="color: #a3e635; font-weight: bold; text-transform: uppercase;">{user.role}</span></div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://gridguardsolarmonitoring.web.app/login" style="display: inline-block; background: #a3e635; color: #020617; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; font-size: 13px;">Login to Console</a>
              </div>
            </div>"""
            send_smtp_email([clean_email], w_subj, w_text, w_html)
        threading.Thread(target=send_welcome_async, daemon=True).start()

    return {
        "success": True,
        "id": str(user.id),
        "uid": str(user.id),
        "email": user.email,
        "role": user.role,
        "isAdmin": (user.role == "admin"),
        "status": "active" if user.is_active else "disabled",
    }


@app.put("/api/users/{user_identifier}")
def update_user(user_identifier: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    user = None
    try:
        uuid_obj = uuid.UUID(user_identifier)
        user = db.query(User).filter(User.id == uuid_obj).first()
    except Exception:
        pass

    if not user:
        user = db.query(User).filter(User.email.ilike(user_identifier.strip())).first()
    if not user:
        user = db.query(User).filter(User.firebase_uid == user_identifier).first()
    if not user and user_identifier.startswith("usr_"):
        clean_key = user_identifier.replace("usr_", "").lower()
        for u in db.query(User).all():
            norm = re.sub(r'[^a-zA-Z0-9]', '_', u.email.lower())
            if norm == clean_key:
                user = u
                break

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "name" in payload and payload["name"]:
        user.name = str(payload["name"])
    if "phone" in payload:
        user.phone = str(payload["phone"]) if payload["phone"] else None
    if "isAdmin" in payload:
        user.role = "admin" if payload["isAdmin"] else "member"
    elif "role" in payload and payload["role"]:
        user.role = "admin" if str(payload["role"]).lower() == "admin" else "member"
    if "status" in payload:
        user.is_active = (str(payload["status"]).lower() == "active")
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    if "profile_image" in payload:
        user.profile_image = str(payload["profile_image"]) if payload["profile_image"] else None
    if "firebase_uid" in payload and payload["firebase_uid"]:
        user.firebase_uid = str(payload["firebase_uid"])

    user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(user)

    return {"success": True, "message": "User updated successfully", "user": {
        "id": str(user.id),
        "uid": str(user.id),
        "email": user.email,
        "role": user.role,
        "isAdmin": (user.role == "admin"),
        "status": "active" if user.is_active else "disabled"
    }}


@app.delete("/api/users/{user_identifier}")
def delete_user(user_identifier: str, db: Session = Depends(get_db)):
    user = None
    try:
        uuid_obj = uuid.UUID(user_identifier)
        user = db.query(User).filter(User.id == uuid_obj).first()
    except Exception:
        pass

    if not user:
        user = db.query(User).filter(User.email.ilike(user_identifier.strip())).first()
    if not user:
        user = db.query(User).filter(User.firebase_uid == user_identifier).first()
    if not user and user_identifier.startswith("usr_"):
        clean_key = user_identifier.replace("usr_", "").lower()
        for u in db.query(User).all():
            norm = re.sub(r'[^a-zA-Z0-9]', '_', u.email.lower())
            if norm == clean_key:
                user = u
                break

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"success": True, "message": "User deleted successfully"}


@app.post("/api/users/sync-firebase")
def sync_firebase_user(payload: FirebaseSyncPayload, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    if user:
        user.firebase_uid = payload.firebase_uid
        if payload.name and not user.name:
            user.name = payload.name
        user.last_login_at = now_dt
        user.updated_at = now_dt
    else:
        user = User(
            firebase_uid=payload.firebase_uid,
            name=payload.name or clean_email.split("@")[0],
            email=clean_email,
            role="admin" if clean_email == "sriramkanuri4@gmail.com" else "user",
            is_active=True,
            last_login_at=now_dt,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "id": str(user.id),
        "firebase_uid": user.firebase_uid,
        "role": user.role,
        "isAdmin": (user.role == "admin"),
    }


# ==========================================================
# SOLAR NODES ENDPOINTS (PostgreSQL 'solar_nodes' table)
# ==========================================================
@app.get("/api/nodes")
def get_all_nodes(db: Session = Depends(get_db)):
    nodes = db.query(SolarNode).order_by(SolarNode.node_id.asc()).all()
    tel = latest_telemetry_cache.copy()

    result = []
    for n in nodes:
        is_primary = (n.node_id == "GG-NODE-01")
        result.append({
            "id": str(n.id),
            "nodeId": n.node_id,
            "name": n.name,
            "location": n.location or "Facility Field",
            "status": tel.get("status", n.status) if is_primary else n.status,
            "lastSeen": n.last_seen.isoformat() if n.last_seen else (n.created_at.isoformat() if n.created_at else None),
            "voltage": float(tel.get("voltage", 230.5)) if is_primary else 229.8,
            "current": float(tel.get("current", 12.0)) if is_primary else 9.4,
            "power": float(tel.get("power", 4.82)) if is_primary else 3.25,
            "energy": float(tel.get("energy", 45.2)) if is_primary else 31.8,
            "temperature": float(tel.get("temperature", 34.0)) if is_primary else 34.2,
            "firmware": n.firmware_version or "v2.4.1-prod",
            "rated_output_kw": float(n.rated_output_kw) if n.rated_output_kw else 5.0,
            "connection_protocol": n.connection_protocol or "MQTT",
            "device_type": n.device_type or "Solar Array",
        })
    return result


@app.post("/api/nodes")
def create_or_update_node(payload: NodeCreateOrUpdatePayload, db: Session = Depends(get_db)):
    node = db.query(SolarNode).filter(SolarNode.node_id == payload.nodeId).first()
    now_dt = datetime.datetime.now(datetime.timezone.utc)

    if node:
        node.name = payload.name
        if payload.location:
            node.location = payload.location
        if payload.status:
            node.status = payload.status
        if payload.rated_output_kw:
            node.rated_output_kw = payload.rated_output_kw
        if payload.connection_protocol:
            node.connection_protocol = payload.connection_protocol
        if payload.firmware_version:
            node.firmware_version = payload.firmware_version
        node.updated_at = now_dt
        node.last_seen = now_dt
    else:
        node = SolarNode(
            node_id=payload.nodeId,
            name=payload.name,
            location=payload.location or "Array Field",
            status=payload.status or "ONLINE",
            rated_output_kw=payload.rated_output_kw or 5.0,
            connection_protocol=payload.connection_protocol or "MQTT",
            device_type=payload.device_type or "Solar Array",
            firmware_version=payload.firmware_version or "v2.4.1-prod",
            created_at=now_dt,
            updated_at=now_dt,
            last_seen=now_dt,
        )
        db.add(node)

    db.commit()
    db.refresh(node)
    return {"success": True, "nodeId": node.node_id, "id": str(node.id)}


@app.put("/api/nodes/{node_id}")
def update_node(node_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    node = db.query(SolarNode).filter(SolarNode.node_id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    if "name" in payload:
        node.name = str(payload["name"])
    if "location" in payload:
        node.location = str(payload["location"])
    if "status" in payload:
        node.status = str(payload["status"])
    if "firmware" in payload or "firmware_version" in payload:
        node.firmware_version = str(payload.get("firmware") or payload.get("firmware_version"))

    node.updated_at = datetime.datetime.now(datetime.timezone.utc)
    node.last_seen = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"success": True, "message": "Node updated successfully"}


@app.delete("/api/nodes/{node_id}")
def delete_node(node_id: str, db: Session = Depends(get_db)):
    node = db.query(SolarNode).filter(SolarNode.node_id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(node)
    db.commit()
    return {"success": True, "message": "Node deleted successfully"}


# ==========================================================
# SENSORS ENDPOINTS (PostgreSQL 'sensors' table)
# ==========================================================
@app.get("/api/sensors")
def get_all_sensors(db: Session = Depends(get_db)):
    sensors = db.query(Sensor).order_by(Sensor.sensor_id.asc()).all()
    tel = latest_telemetry_cache.copy()

    result = []
    for s in sensors:
        result.append({
            "id": s.sensor_id,
            "sensor_id": s.sensor_id,
            "name": s.name or s.sensor_id,
            "room": s.location or "Facility Field",
            "connectionType": "ESP32",
            "endpoint": "192.168.1.101:8080",
            "ratedPower": 3.2,
            "power": float(tel.get("power", 3.18)),
            "voltage": float(tel.get("voltage", 231.2)),
            "current": float(tel.get("current", 13.8)),
            "temperature": float(tel.get("temperature", 34.5)),
            "humidity": 58,
            "pressure": 1012,
            "status": s.status or "normal",
            "lastSeen": s.last_seen.isoformat() if s.last_seen else (s.created_at.isoformat() if s.created_at else None),
            "unit": s.unit or "kW",
        })
    return result


@app.post("/api/sensors")
def create_or_update_sensor(payload: SensorCreateOrUpdatePayload, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.sensor_id == payload.sensor_id).first()
    primary_node = db.query(SolarNode).filter(SolarNode.node_id == (payload.node_id or "GG-NODE-01")).first()
    if not primary_node:
        primary_node = db.query(SolarNode).first()

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    if sensor:
        if payload.name:
            sensor.name = payload.name
        if payload.location:
            sensor.location = payload.location
        if payload.status:
            sensor.status = payload.status
        if payload.unit:
            sensor.unit = payload.unit
        sensor.updated_at = now_dt
        sensor.last_seen = now_dt
    else:
        sensor = Sensor(
            sensor_id=payload.sensor_id,
            node_id=primary_node.id if primary_node else uuid.uuid4(),
            name=payload.name or payload.sensor_id,
            sensor_type=payload.sensor_type or "inverter",
            location=payload.location or "Facility Field",
            status=payload.status or "normal",
            unit=payload.unit or "kW",
            created_at=now_dt,
            updated_at=now_dt,
            last_seen=now_dt,
        )
        db.add(sensor)

    db.commit()
    db.refresh(sensor)
    return {"success": True, "sensor_id": sensor.sensor_id, "id": str(sensor.id)}


@app.put("/api/sensors/{sensor_id}")
def update_sensor(sensor_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    if "name" in payload:
        sensor.name = str(payload["name"])
    if "location" in payload or "room" in payload:
        sensor.location = str(payload.get("location") or payload.get("room"))
    if "status" in payload:
        sensor.status = str(payload["status"])

    sensor.updated_at = datetime.datetime.now(datetime.timezone.utc)
    sensor.last_seen = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"success": True, "message": "Sensor updated successfully"}


@app.delete("/api/sensors/{sensor_id}")
def delete_sensor(sensor_id: str, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    db.delete(sensor)
    db.commit()
    return {"success": True, "message": "Sensor deleted successfully"}


# ==========================================================
# TELEMETRY ENDPOINTS (PostgreSQL 'sensor_readings' & 'grid_telemetry')
# ==========================================================
@app.get("/api/telemetry/live")
def get_live_telemetry():
    tel = latest_telemetry_cache.copy()
    if not tel:
        tel = {
            "nodeId": "GG-NODE-01",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "voltage": 230.8,
            "current": 14.2,
            "power": 4.82,
            "energy": 45.2,
            "temperature": 34.2,
            "irradiance": 865.0,
            "efficiency": 95.2,
            "frequency": 50.02,
            "powerFactor": 0.985,
            "status": "ONLINE",
        }
    return {"GG-NODE-01": tel}


@app.get("/api/telemetry/live/{node_id}")
def get_live_node_telemetry(node_id: str):
    tel = latest_telemetry_cache.copy()
    if not tel:
        tel = {
            "nodeId": node_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "voltage": 230.8,
            "current": 14.2,
            "power": 4.82,
            "energy": 45.2,
            "temperature": 34.2,
            "irradiance": 865.0,
            "efficiency": 95.2,
            "frequency": 50.02,
            "powerFactor": 0.985,
            "status": "ONLINE",
        }
    return tel


@app.post("/api/telemetry")
def push_telemetry(payload: TelemetryPushPayload, db: Session = Depends(get_db)):
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    primary_node = db.query(SolarNode).filter(SolarNode.node_id == payload.nodeId).first()
    node_uuid = primary_node.id if primary_node else None

    # Update cache
    latest_telemetry_cache.update({
        "nodeId": payload.nodeId,
        "timestamp": now_dt.isoformat(),
        "voltage": payload.voltage,
        "current": payload.current,
        "power": payload.power,
        "energy": payload.energy,
        "temperature": payload.temperature,
        "irradiance": payload.irradiance,
        "frequency": payload.frequency,
        "powerFactor": payload.powerFactor,
        "status": payload.status,
    })

    # Save to PostgreSQL
    reading = SensorReading(
        node_id=node_uuid,
        timestamp=now_dt,
        power_kw=payload.power,
        voltage_v=payload.voltage,
        current_a=payload.current,
        temperature_c=payload.temperature,
        irradiance_w_m2=payload.irradiance,
        frequency_hz=payload.frequency,
        power_factor=payload.powerFactor,
        energy_kwh=payload.energy,
        status=payload.status,
    )
    db.add(reading)
    db.commit()

    return {"success": True, "timestamp": now_dt.isoformat()}


@app.get("/api/telemetry/history")
def get_telemetry_history(limit: int = 50, db: Session = Depends(get_db)):
    readings = db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(min(limit, 500)).all()
    result = []
    for r in readings:
        result.append({
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "power": r.power_kw,
            "voltage": r.voltage_v,
            "current": r.current_a,
            "temperature": r.temperature_c,
            "irradiance": r.irradiance_w_m2,
            "energy": r.energy_kwh,
            "status": r.status,
        })
    return result


@app.get("/api/grid-telemetry")
def get_grid_telemetry(limit: int = 30, db: Session = Depends(get_db)):
    rows = db.query(GridTelemetry).order_by(GridTelemetry.timestamp.desc()).limit(min(limit, 200)).all()
    return [{
        "id": r.id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "grid_voltage_v": r.grid_voltage_v,
        "grid_current_a": r.grid_current_a,
        "grid_frequency_hz": r.grid_frequency_hz,
        "power_factor": r.power_factor,
        "interlock_state": r.interlock_state,
        "grid_status": r.grid_status,
    } for r in rows]


@app.get("/api/energy-analytics")
def get_energy_analytics(limit: int = 30, db: Session = Depends(get_db)):
    rows = db.query(EnergyAnalytics).order_by(EnergyAnalytics.timestamp.desc()).limit(min(limit, 200)).all()
    return [{
        "id": r.id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "solar_power_kw": r.solar_power_kw,
        "energy_generated_kwh": r.energy_generated_kwh,
        "average_power_kw": r.average_power_kw,
        "peak_power_kw": r.peak_power_kw,
        "inverter_efficiency_percent": r.inverter_efficiency_percent,
    } for r in rows]


@app.get("/api/battery-analytics")
def get_battery_analytics(limit: int = 30, db: Session = Depends(get_db)):
    rows = db.query(BatteryAnalytics).order_by(BatteryAnalytics.timestamp.desc()).limit(min(limit, 200)).all()
    return [{
        "id": r.id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "battery_soc_percent": r.battery_soc_percent,
        "battery_voltage_v": r.battery_voltage_v,
        "battery_power_kw": r.battery_power_kw,
        "battery_temperature_c": r.battery_temperature_c,
        "operating_state": r.operating_state,
    } for r in rows]


# ==========================================================
# ALERTS ENDPOINTS (PostgreSQL 'alerts' table)
# ==========================================================
@app.get("/api/alerts")
def get_all_alerts(limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(min(limit, 300)).all()
    result = []
    for a in alerts:
        result.append({
            "id": f"alt_{a.id}",
            "raw_id": a.id,
            "nodeId": "GG-NODE-01",
            "type": a.alert_type,
            "severity": a.severity,
            "title": a.title or f"{a.severity} Alert",
            "message": a.message or "Solar Array Condition Flagged",
            "value": a.value or 0.0,
            "threshold": a.threshold or 0.0,
            "resolved": (a.status == "RESOLVED"),
            "status": a.status,
            "acknowledged": (a.acknowledged_at is not None),
            "acknowledgedAt": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "resolvedAt": a.resolved_at.isoformat() if a.resolved_at else None,
            "timestamp": a.created_at.isoformat() if a.created_at else None,
        })
    return result


@app.post("/api/alerts")
def create_alert(payload: AlertCreatePayload, db: Session = Depends(get_db)):
    primary_node = db.query(SolarNode).filter(SolarNode.node_id == payload.nodeId).first()
    node_uuid = primary_node.id if primary_node else None
    now_dt = datetime.datetime.now(datetime.timezone.utc)

    alert = Alert(
        node_id=node_uuid,
        alert_type=payload.type,
        severity=payload.severity.upper(),
        title=payload.title or f"{payload.severity.upper()} Alert",
        message=payload.message,
        value=payload.value,
        threshold=payload.threshold,
        status="ACTIVE",
        created_at=now_dt,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return {"success": True, "id": f"alt_{alert.id}", "raw_id": alert.id}


@app.post("/api/alerts/{alert_identifier}/acknowledge")
def acknowledge_alert(alert_identifier: str, payload: Dict[str, Any] = None, db: Session = Depends(get_db)):
    clean_id = alert_identifier.replace("alt_", "").replace("alert_", "")
    try:
        raw_id = int(clean_id)
        alert = db.query(Alert).filter(Alert.id == raw_id).first()
    except Exception:
        alert = db.query(Alert).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"success": True, "message": "Alert acknowledged in PostgreSQL"}


@app.post("/api/alerts/{alert_identifier}/resolve")
def resolve_alert(alert_identifier: str, db: Session = Depends(get_db)):
    clean_id = alert_identifier.replace("alt_", "").replace("alert_", "")
    try:
        raw_id = int(clean_id)
        alert = db.query(Alert).filter(Alert.id == raw_id).first()
    except Exception:
        alert = db.query(Alert).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"success": True, "message": "Alert resolved in PostgreSQL"}


# ==========================================================
# ML ANOMALY DETECTION & HISTORY (PostgreSQL 'ml_detections')
# ==========================================================
@app.get("/api/ml/detections")
def get_ml_detections(limit: int = 50, db: Session = Depends(get_db)):
    detections = db.query(MLDetection).order_by(MLDetection.timestamp.desc()).limit(min(limit, 200)).all()
    result = []
    for d in detections:
        result.append({
            "id": f"det_{d.id}",
            "timestamp": d.timestamp.isoformat() if d.timestamp else None,
            "dc_power": d.dc_power_w,
            "ac_power": d.ac_power_w,
            "ambient_temp": d.ambient_temperature_c,
            "module_temp": d.module_temperature_c,
            "irradiance": d.irradiation_w_m2,
            "anomaly_score": d.anomaly_score,
            "prediction": d.prediction,
            "status": d.detection_status,
            "model_name": d.model_name,
        })
    return result


@app.get("/api/ml/history")
def get_ml_history():
    return ml_inference_history[:50]


@app.post("/predict")
@app.post("/api/anomaly/predict")
@app.post("/api/ml/predict")
def predict_anomaly(data: SolarReading, db: Session = Depends(get_db)):
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Isolation Forest model is not loaded on this server.",
        )

    reading = data.model_dump()
    hour = reading.pop("hour")
    df = pd.DataFrame([reading])

    df["HOUR_SIN"] = np.sin(2 * np.pi * hour / 24)
    df["HOUR_COS"] = np.cos(2 * np.pi * hour / 24)

    dc_power = df["DC_POWER"].iloc[0]
    ac_power = df["AC_POWER"].iloc[0]
    irradiation = df["IRRADIATION"].iloc[0]

    df["AC_DC_RATIO"] = (ac_power / dc_power) if dc_power > 1 else 0
    df["POWER_PER_IRRADIANCE"] = (ac_power / irradiation) if irradiation > 0.05 else 0
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

    try:
        prediction = int(model.predict(df[features])[0])
        anomaly_score = float(model.decision_function(df[features])[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model evaluation error: {e}",
        )

    is_normal = (prediction == 1)
    status_label = "NORMAL" if is_normal else "ABNORMAL"
    now_dt = datetime.datetime.now(datetime.timezone.utc)

    # Persist in PostgreSQL ml_detections if anomaly
    if not is_normal:
        try:
            primary_node = db.query(SolarNode).filter(SolarNode.node_id == "GG-NODE-01").first()
            node_uuid = primary_node.id if primary_node else None

            det = MLDetection(
                node_id=node_uuid,
                timestamp=now_dt,
                dc_power_w=dc_power,
                ac_power_w=ac_power,
                ambient_temperature_c=reading.get("AMBIENT_TEMPERATURE", 28.0),
                module_temperature_c=reading.get("MODULE_TEMPERATURE", 34.0),
                irradiation_w_m2=irradiation * 1000.0,
                anomaly_score=round(anomaly_score, 5),
                prediction=prediction,
                detection_status="ABNORMAL",
                model_name="Isolation Forest",
                model_version="v2.0.0",
                confidence=round(abs(anomaly_score), 4),
                created_at=now_dt,
            )
            db.add(det)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[ML Prediction DB Error] {e}")

    return {
        "status": status_label,
        "prediction": prediction,
        "anomaly_score": round(anomaly_score, 5),
        "is_anomaly": not is_normal,
        "message": (
            "Solar inverter arrays operating within nominal distribution"
            if is_normal
            else "Isolation Forest flagged abnormal generation disparity"
        ),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


# ==========================================================
# AUDIT LOGS ENDPOINTS (PostgreSQL 'audit_logs' table)
# ==========================================================
@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 300)).all()
    result = []
    for l in logs:
        result.append({
            "id": f"log_{l.id}",
            "uid": str(l.user_id) if l.user_id else "system",
            "actorEmail": l.user.email if l.user else "sriramkanuri4@gmail.com",
            "action": l.action,
            "target": l.entity_id or l.entity_type or "platform",
            "timestamp": l.created_at.isoformat() if l.created_at else None,
            "metadata": l.event_metadata or {},
        })
    return result


@app.post("/api/audit-logs")
def create_audit_log(payload: AuditLogPayload, db: Session = Depends(get_db)):
    user_obj = None
    if payload.actorEmail:
        user_obj = db.query(User).filter(User.email.ilike(payload.actorEmail.strip())).first()

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    log = AuditLog(
        user_id=user_obj.id if user_obj else None,
        action=payload.action,
        entity_type="SYSTEM",
        entity_id=payload.target or "platform",
        description=f"Action: {payload.action}",
        event_metadata=payload.metadata or {},
        created_at=now_dt,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"success": True, "id": f"log_{log.id}"}


# ==========================================================
# PRESENCE ENDPOINTS (PostgreSQL 'presence' table)
# ==========================================================
@app.get("/api/presence")
def get_presence(db: Session = Depends(get_db)):
    presences = db.query(Presence).all()
    result = {}
    for p in presences:
        user_email = p.user.email if p.user else ""
        user_name = p.user.name if p.user else ""
        uid = str(p.user_id)
        result[uid] = {
            "uid": uid,
            "online": p.online,
            "lastSeen": p.last_seen.isoformat() if p.last_seen else None,
            "sessionId": p.session_id,
            "email": user_email,
            "name": user_name,
        }
    return result


@app.post("/api/presence")
@app.post("/api/presence/heartbeat")
def presence_heartbeat(payload: PresencePayload, db: Session = Depends(get_db)):
    clean_email = payload.user_email.strip().lower()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if not user:
        user = User(
            name=clean_email.split("@")[0],
            email=clean_email,
            role="user",
            is_active=True,
        )
        db.add(user)
        db.flush()

    pres = db.query(Presence).filter(Presence.user_id == user.id).first()
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    if pres:
        pres.online = payload.online
        pres.session_id = payload.session_id or pres.session_id
        pres.last_seen = now_dt
        pres.updated_at = now_dt
    else:
        pres = Presence(
            user_id=user.id,
            session_id=payload.session_id,
            online=payload.online,
            last_seen=now_dt,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(pres)

    db.commit()
    return {"success": True, "online": payload.online}


@app.post("/api/presence/offline")
def presence_offline(payload: PresencePayload, db: Session = Depends(get_db)):
    clean_email = payload.user_email.strip().lower()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if user:
        pres = db.query(Presence).filter(Presence.user_id == user.id).first()
        if pres:
            pres.online = False
            pres.last_seen = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
    return {"success": True}


# ==========================================================
# SYSTEM STATUS & SETTINGS (PostgreSQL 'system_status' table)
# ==========================================================
@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    status_row = db.query(SystemStatus).order_by(SystemStatus.timestamp.desc()).first()
    meta = status_row.additional_data or {} if status_row else {}
    return {
        "status": status_row.system_state or status_row.hardware_status or "OPTIMAL" if status_row else "OPTIMAL",
        "lastUpdate": status_row.timestamp.isoformat() if (status_row and status_row.timestamp) else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": meta.get("version", "2.1.0-prod"),
        "maintenanceMode": bool(SYSTEM_SETTINGS.get("maintenanceMode", False)),
        "stopMlDetectionMails": bool(SYSTEM_SETTINGS.get("stopMlDetectionMails", False)),
        "database": status_row.database_status if status_row else "POSTGRESQL_18_ACTIVE",
    }


@app.get("/api/system/settings")
@app.get("/api/ml/email-settings")
def get_system_settings(db: Session = Depends(get_db)):
    return {
        "maintenanceMode": bool(SYSTEM_SETTINGS.get("maintenanceMode", False)),
        "stopMlDetectionMails": bool(SYSTEM_SETTINGS.get("stopMlDetectionMails", False)),
        "stop_ml_detection_mails": bool(SYSTEM_SETTINGS.get("stopMlDetectionMails", False)),
    }


@app.post("/api/system/settings")
@app.post("/api/ml/toggle-emails")
def update_system_settings(payload: Dict[str, Any], db: Session = Depends(get_db)):
    if "maintenanceMode" in payload:
        SYSTEM_SETTINGS["maintenanceMode"] = bool(payload["maintenanceMode"])
    if "stopMlDetectionMails" in payload:
        SYSTEM_SETTINGS["stopMlDetectionMails"] = bool(payload["stopMlDetectionMails"])
    if "stop_ml_detection_mails" in payload:
        SYSTEM_SETTINGS["stopMlDetectionMails"] = bool(payload["stop_ml_detection_mails"])

    status_row = db.query(SystemStatus).order_by(SystemStatus.timestamp.desc()).first()
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    current_meta = status_row.additional_data.copy() if (status_row and status_row.additional_data) else {}
    current_meta["maintenanceMode"] = SYSTEM_SETTINGS["maintenanceMode"]
    current_meta["stopMlDetectionMails"] = SYSTEM_SETTINGS["stopMlDetectionMails"]
    current_meta["stop_ml_detection_mails"] = SYSTEM_SETTINGS["stopMlDetectionMails"]

    new_status = SystemStatus(
        timestamp=now_dt,
        hardware_status="OPTIMAL",
        api_status="ONLINE",
        database_status="POSTGRESQL_18_ACTIVE",
        ml_server_status="ARMED",
        active_nodes=db.query(SolarNode).filter(SolarNode.status != "offline").count(),
        active_sensors=db.query(Sensor).filter(Sensor.status != "offline").count(),
        system_state="MAINTENANCE" if SYSTEM_SETTINGS["maintenanceMode"] else "OPTIMAL",
        additional_data=current_meta,
    )
    db.add(new_status)
    db.commit()

    return {
        "success": True,
        "maintenanceMode": SYSTEM_SETTINGS["maintenanceMode"],
        "stopMlDetectionMails": SYSTEM_SETTINGS["stopMlDetectionMails"],
        "stop_ml_detection_mails": SYSTEM_SETTINGS["stopMlDetectionMails"],
    }


# ==========================================================
# AUTH, OTP & MFA ENDPOINTS
# ==========================================================
@app.post("/api/auth/send-otp")
def send_otp(payload: SendOtpPayload, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()

    # Synchronize with client-provided 6-digit OTP if provided, otherwise generate secure code
    if payload.otp and len(str(payload.otp).strip()) == 6 and str(payload.otp).strip().isdigit():
        otp_code = str(payload.otp).strip()
    else:
        otp_code = f"{secrets.randbelow(900000) + 100000}"

    otp_store[clean_email] = {
        "otp": otp_code,
        "expires_at": time.time() + 300,
        "attempts": 0,
    }

    # Ensure user is registered in PostgreSQL users table
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if not user:
        user = User(
            name=clean_email.split("@")[0],
            email=clean_email,
            role="admin" if clean_email == "sriramkanuri4@gmail.com" else "member",
            is_active=True,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            updated_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(user)
        db.commit()

    subject = f"Grid Guard Verification Code: {otp_code}"
    text_content = f"""Hello,

Your 6-digit verification code for Grid Guard Solar Monitoring is: {otp_code}

This code expires in 5 minutes. If you did not request this login, please disregard this email.

Best regards,
Grid Guard Security Team
"""

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #030712; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #a3e635; color: #020617; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 8px; letter-spacing: 0.1em; text-transform: uppercase;">
                GRID GUARD SOLAR
            </div>
            <h2 style="color: #ffffff; margin-top: 16px; font-size: 22px; font-weight: 700;">Operator Verification Code</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Use the one-time code below to establish your secure session.</p>
        </div>
        <div style="background: #0b1628; border: 1px solid #10b981; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #a3e635;">{otp_code}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
            This authentication code will expire in <strong>5 minutes</strong>. If you did not initiate this request, no action is required.
        </p>
    </div>
    """

    success = send_smtp_email([clean_email], subject, text_content, html_content)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please verify SMTP configuration.",
        )

    return {
        "success": True,
        "message": f"Verification code sent to {clean_email}",
        "otp": otp_code,
        "expires_in_seconds": 300,
    }


@app.post("/api/auth/verify-otp")
def verify_otp(payload: VerifyOtpPayload, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user_otp = payload.otp.strip()

    record = otp_store.get(clean_email)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code active for this email. Request a new OTP.",
        )

    if time.time() > record["expires_at"]:
        del otp_store[clean_email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    record["attempts"] += 1
    if record["attempts"] > 5:
        del otp_store[clean_email]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Code invalidated. Please request a new one.",
        )

    if user_otp != record["otp"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect 6-digit verification code. Please check and retry.",
        )

    del otp_store[clean_email]

    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    is_admin = (user and user.role == "admin") or (clean_email == "sriramkanuri4@gmail.com")

    # Record login timestamp
    if user:
        user.last_login_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

    return {
        "success": True,
        "email": clean_email,
        "role": user.role if user else ("admin" if is_admin else "member"),
        "isAdmin": is_admin,
        "message": "OTP verification successful.",
    }


@app.post("/api/auth/mfa/generate")
def mfa_generate(payload: MfaGeneratePayload):
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=500, detail="pyotp library is not installed.")

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=payload.email, issuer_name="GridGuard Solar")

    return {
        "secret": secret,
        "otpauth_url": otpauth_url,
    }


@app.post("/api/auth/mfa/verify")
def mfa_verify(payload: MfaVerifyPayload):
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=500, detail="pyotp library is not installed.")

    totp = pyotp.TOTP(payload.secret)
    is_valid = totp.verify(payload.code.strip(), valid_window=1)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit authenticator code. Check your device clock and retry.",
        )

    return {
        "valid": True,
        "message": "Authenticator code verified successfully.",
    }


@app.post("/api/admin/send-email")
def admin_send_email(payload: SendEmailPayload):
    if not payload.recipients:
        raise HTTPException(status_code=400, detail="Recipient list cannot be empty.")

    subject = payload.subject.strip()
    raw_message = payload.message.strip()

    html = payload.html_message or f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #030712; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="background: #a3e635; color: #020617; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.1em; text-transform: uppercase;">
                GRID GUARD NOTIFICATION
            </span>
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 12px 0 0;">{subject}</h2>
        </div>
        <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">
{raw_message}
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; color: #64748b; font-size: 11px;">
            Automated dispatch from Grid Guard Solar Monitoring Console (PostgreSQL 18 Backend).
        </div>
    </div>
    """

    success = send_smtp_email(payload.recipients, subject, raw_message, html)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to dispatch emails via SMTP server.")

    return {
        "success": True,
        "sent_count": len(payload.recipients),
        "recipients": payload.recipients,
    }


@app.post("/api/alerts/telegram")
def send_telegram_alert(payload: TelegramAlertPayload):
    bot_token = payload.bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = payload.chat_id or os.getenv("TELEGRAM_CHAT_ID", "").strip()

    if not bot_token or not chat_id:
        return {
            "success": False,
            "status": "TELEGRAM_NOT_CONFIGURED",
            "message": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in settings/environment.",
        }

    cache_key = f"{payload.node_id}:{payload.severity}:{payload.message}"
    last_sent = telegram_cooldown_cache.get(cache_key, 0)
    if time.time() - last_sent < 60:
        return {
            "success": True,
            "status": "DEBOUNCED",
            "message": "Duplicate alert suppressed by 60s cooldown buffer.",
        }

    tg_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    formatted_text = f"""🚨 *GRID GUARD SOLAR ALERT*
*Severity:* {payload.severity}
*Node:* {payload.node_id}
*Message:* {payload.message}
*Time:* {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

_Please inspect the Grid Guard Control Console immediately._"""

    try:
        res = requests.post(
            tg_url,
            json={"chat_id": chat_id, "text": formatted_text, "parse_mode": "Markdown"},
            timeout=10,
        )
        if res.status_code == 200:
            telegram_cooldown_cache[cache_key] = time.time()
            return {"success": True, "status": "DELIVERED"}
        else:
            return {
                "success": False,
                "status": "TELEGRAM_ERROR",
                "detail": res.text,
            }
    except Exception as e:
        return {"success": False, "status": "REQUEST_FAILED", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)

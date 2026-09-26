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
from pathlib import Path
from typing import Any, Dict, List, Optional

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
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(
    title="Grid Guard Solar Monitoring API",
    description="Real-time Solar Telemetry, ML Isolation Forest Anomaly Detection, OTP & Alerting Service",
    version="2.0.0",
)

# CORS configuration (supports production Firebase Hosting and localhost dev)
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

# Load Trained Isolation Forest Model
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

# 24/7 Autonomous ML Engine state
latest_telemetry_cache: Dict[str, Any] = {}
last_24h_email_sent: float = 0.0

# Pydantic Schemas
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

class SendOtpPayload(BaseModel):
    email: str

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


# Helper: Send Email via SMTP
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

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
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


START_TIME = time.time()

# ==========================================================
# ENDPOINTS
# ==========================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Grid Guard Solar Monitoring API",
        "version": "2.0.0",
        "model_loaded": model is not None,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Grid Guard API",
        "version": "2.0.0",
        "model": "Isolation Forest" if model is not None else "unavailable",
        "model_loaded": model is not None,
        "uptime_seconds": int(time.time() - START_TIME),
        "timestamp": int(time.time()),
        "smtp_configured": bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS")),
    }


# ML Prediction Endpoints
@app.post("/predict")
@app.post("/api/anomaly/predict")
def predict_anomaly(data: SolarReading):
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Isolation Forest model is not loaded on this server.",
        )

    reading = data.model_dump()
    hour = reading.pop("hour")
    df = pd.DataFrame([reading])

    # Feature Engineering
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


# OTP Endpoints
@app.post("/api/auth/send-otp")
def send_otp(payload: SendOtpPayload):
    clean_email = payload.email.strip().lower()
    
    # Generate 6-digit secure numeric code
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    
    otp_store[clean_email] = {
        "otp": otp_code,
        "expires_at": time.time() + 300,  # 5 minutes
        "attempts": 0,
    }

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
        "expires_in_seconds": 300,
    }


@app.post("/api/auth/verify-otp")
def verify_otp(payload: VerifyOtpPayload):
    clean_email = payload.email.strip().lower()
    user_otp = payload.otp.strip()

    record = otp_store.get(clean_email)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code active for this email. Request a new OTP.",
        )

    # Check expiration
    if time.time() > record["expires_at"]:
        del otp_store[clean_email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    # Check attempt threshold (max 5)
    record["attempts"] += 1
    if record["attempts"] > 5:
        del otp_store[clean_email]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Code invalidated. Please request a new one.",
        )

    # Validate OTP
    if user_otp != record["otp"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect 6-digit verification code. Please check and retry.",
        )

    # Success: consume OTP immediately
    del otp_store[clean_email]

    # Check if admin email
    admin_email = os.getenv("ADMIN_EMAIL", "sriramkanuri4@gmail.com").strip().lower()
    is_admin = (clean_email == admin_email)

    return {
        "success": True,
        "email": clean_email,
        "role": "admin" if is_admin else "member",
        "isAdmin": is_admin,
        "message": "OTP verification successful.",
    }


# MFA Authenticator (TOTP) Endpoints
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
    # Allow 1 time-step drift (+/- 30s)
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


# Admin Email Dispatcher
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
            Automated dispatch from Grid Guard Solar Monitoring Console.
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


# Telegram Critical Alert Dispatcher
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

    # Debounce identical messages within 60 seconds
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


# ==========================================================
# FIREBASE REALTIME DATABASE 24/7 BACKGROUND SYNC ENGINE
# ==========================================================
RTDB_BASE_URL = os.getenv("VITE_FIREBASE_DATABASE_URL", "https://gridguardsolarmonitoring-default-rtdb.firebaseio.com").rstrip("/")

rtdb_sync_state: Dict[str, Any] = {
    "status": "INITIALIZING",
    "last_write": None,
    "last_error": None,
    "seeded": False,
    "ticks": 0,
    "url": RTDB_BASE_URL,
}

def seed_rtdb_data() -> bool:
    """Seeds default nodes, sensors, users, and system metadata into Firebase RTDB."""
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    seed_payload = {
        "nodes": {
            "GG-NODE-01": {
                "nodeId": "GG-NODE-01",
                "name": "Substation Alpha Array",
                "location": "Main Substation Sector 4",
                "status": "ONLINE",
                "lastSeen": now_iso,
                "voltage": 231.2,
                "current": 12.8,
                "power": 4.82,
                "energy": 45.2,
                "temperature": 36.4,
                "firmware": "v2.4.1-prod",
            },
            "GG-NODE-02": {
                "nodeId": "GG-NODE-02",
                "name": "Rooftop Commercial PV",
                "location": "Building C Industrial Roof",
                "status": "ONLINE",
                "lastSeen": now_iso,
                "voltage": 229.8,
                "current": 9.4,
                "power": 3.25,
                "energy": 31.8,
                "temperature": 34.2,
                "firmware": "v2.4.1-prod",
            },
        },
        "sensors": {
            "sensor-01": {
                "id": "sensor-01",
                "name": "Main Solar String Inverter A",
                "room": "Array Shed North",
                "connectionType": "ESP32",
                "endpoint": "192.168.1.101:8080",
                "ratedPower": 3.2,
                "power": 3.18,
                "voltage": 231.2,
                "current": 13.8,
                "temperature": 34.5,
                "humidity": 58,
                "pressure": 1012,
                "status": "normal",
                "lastSeen": now_iso,
            },
            "sensor-02": {
                "id": "sensor-02",
                "name": "Rooftop Secondary PV Pod",
                "room": "Building C Industrial Roof",
                "connectionType": "Raspberry Pi",
                "endpoint": "192.168.1.102:8080",
                "ratedPower": 2.4,
                "power": 2.35,
                "voltage": 230.4,
                "current": 10.2,
                "temperature": 32.8,
                "humidity": 62,
                "pressure": 1011,
                "status": "normal",
                "lastSeen": now_iso,
            },
        },
        "users": {
            "admin-root-01": {
                "uid": "admin-root-01",
                "email": "sriramkanuri4@gmail.com",
                "name": "Sriram Kanuri (Admin)",
                "role": "admin",
                "isAdmin": True,
                "status": "active",
                "mfaEnabled": True,
                "lastSeen": now_iso,
            },
            "usr_sriramkanuri4_gmail_com": {
                "uid": "usr_sriramkanuri4_gmail_com",
                "email": "sriramkanuri4@gmail.com",
                "name": "Sriram Kanuri",
                "role": "admin",
                "isAdmin": True,
                "status": "active",
                "mfaEnabled": True,
                "lastSeen": now_iso,
            },
            "usr_adityalap007_gmail_com": {
                "uid": "usr_adityalap007_gmail_com",
                "email": "adityalap007@gmail.com",
                "name": "Aditya (Operator)",
                "role": "member",
                "isAdmin": False,
                "status": "active",
                "lastSeen": now_iso,
            },
        },
        "system": {
            "state": {
                "status": "OPTIMAL",
                "lastUpdate": now_iso,
                "version": "2.0.0",
                "maintenanceMode": False,
            }
        },
        "alerts": {
            "alert-init-01": {
                "id": "alert-init-01",
                "title": "Grid Guard System Online",
                "severity": "INFO",
                "message": "Real-time telemetry stream synchronized with Firebase RTDB.",
                "nodeId": "GG-NODE-01",
                "timestamp": now_iso,
                "status": "RESOLVED",
            }
        },
    }
    try:
        res = requests.patch(f"{RTDB_BASE_URL}/.json", json=seed_payload, timeout=6)
        if res.status_code == 200:
            print("[RTDB] Successfully seeded initial data tree into Firebase RTDB!")
            rtdb_sync_state["seeded"] = True
            rtdb_sync_state["status"] = "CONNECTED"
            return True
        else:
            print(f"[RTDB Seed Failed] HTTP {res.status_code}: {res.text}")
            rtdb_sync_state["last_error"] = f"HTTP {res.status_code}: {res.text}"
            return False
    except Exception as e:
        print(f"[RTDB Seed Error] {e}")
        rtdb_sync_state["last_error"] = str(e)
        return False

def rtdb_background_worker():
    """Autonomous background loop: pushes 1-second telemetry to Firebase RTDB."""
    tick_count = 0
    energy_acc = 45.2
    time.sleep(2)  # Initial grace delay

    session = requests.Session()
    session.headers.update({"Connection": "close"})

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
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            # Anomaly simulation: periodic generation disparity (cycles 60-68 every 90s)
            is_anomaly_tick = (tick_count > 15 and (tick_count % 90 >= 60 and tick_count % 90 <= 68))
            if is_anomaly_tick:
                dc_power_w = round(5820.0 + math.sin(t) * 150.0, 1)
                ac_power_w = round(440.0 + math.cos(t) * 40.0, 1)  # 7.5% efficiency -> severe anomaly
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

            res = session.put(
                f"{RTDB_BASE_URL}/telemetry/GG-NODE-01.json",
                json=telemetry_data,
                timeout=4,
            )

            if res.status_code == 200:
                rtdb_sync_state["status"] = "CONNECTED"
                rtdb_sync_state["last_write"] = now_iso
                rtdb_sync_state["last_error"] = None
                rtdb_sync_state["ticks"] = tick_count

                if not rtdb_sync_state["seeded"]:
                    seed_rtdb_data()

                if tick_count % 3 == 0:
                    node_update = {
                        "voltage": bus_voltage,
                        "current": current_a,
                        "power": effective_kw,
                        "energy": energy_acc,
                        "temperature": module_temp,
                        "status": node_status,
                        "lastSeen": now_iso,
                    }
                    session.patch(f"{RTDB_BASE_URL}/nodes/GG-NODE-01.json", json=node_update, timeout=3)

            elif res.status_code in (401, 403):
                rtdb_sync_state["status"] = "PERMISSION_DENIED"
                rtdb_sync_state["last_error"] = "Firebase RTDB Rules block unauthenticated read/write. Set { \".read\": true, \".write\": true } in Firebase Console Rules."
            else:
                rtdb_sync_state["status"] = f"HTTP_{res.status_code}"
                rtdb_sync_state["last_error"] = res.text

        except Exception as e:
            rtdb_sync_state["last_error"] = str(e)
            rtdb_sync_state["status"] = "NETWORK_ERROR"

        time.sleep(1.0)


def autonomous_ml_evaluator_24h():
    """
    Dedicated 24/7 autonomous background evaluator.
    Continuously executes Isolation Forest inference on solar inverter telemetry.
    When generation disparity is flagged (-1):
    1. Persists anomaly in RTDB /anomalies
    2. Raises critical alert in RTDB /alerts
    3. Flags node status as CRITICAL
    4. Gathers all registered operator emails (e.g. adityalap007@gmail.com, sriramkanuri4@gmail.com)
    5. Dispatches diagnostic HTML advisory email via SMTP
    """
    global last_24h_email_sent
    session = requests.Session()
    session.headers.update({"Connection": "close"})
    print("[24/7 ML Engine] Dedicated 24/7 Autonomous Isolation Forest evaluator running.", flush=True)

    time.sleep(5)  # Initial grace delay

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

            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            inf_id = f"inf_24h_{int(time.time() * 1000)}"

            # Save inference record to RTDB /ml_history
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

            # Persist record on anomaly or every ~9 seconds for smooth charts
            if is_anomaly or int(time.time()) % 9 == 0:
                try:
                    session.put(f"{RTDB_BASE_URL}/ml_history/{inf_id}.json", json=inf_record, timeout=5)
                except Exception:
                    pass

            if is_anomaly:
                now_epoch = time.time()
                # 60s cooldown for email broadcast
                if now_epoch - last_24h_email_sent >= 60.0:
                    last_24h_email_sent = now_epoch
                    anom_id = f"anom_24h_{int(now_epoch * 1000)}"

                    # Check if operator stopped ML detection mails
                    stop_ml_mails = False
                    try:
                        s_res = session.get(f"{RTDB_BASE_URL}/systemSettings/stop_ml_detection_mails.json", timeout=3)
                        if s_res.status_code == 200 and s_res.json() is True:
                            stop_ml_mails = True
                        if not stop_ml_mails:
                            sys_res = session.get(f"{RTDB_BASE_URL}/system.json", timeout=3)
                            if sys_res.status_code == 200 and sys_res.json():
                                sj = sys_res.json()
                                if sj.get("stopMlDetectionMails") is True or (isinstance(sj.get("state"), dict) and sj["state"].get("stopMlDetectionMails") is True):
                                    stop_ml_mails = True
                    except Exception:
                        pass

                    # 1. Harvest ALL registered & active operator emails
                    recipients = [os.getenv("ADMIN_EMAIL", "sriramkanuri4@gmail.com")]
                    try:
                        u_res = session.get(f"{RTDB_BASE_URL}/users.json", timeout=6)
                        if u_res.status_code == 200 and u_res.json():
                            u_data = u_res.json()
                            if isinstance(u_data, dict):
                                for u in u_data.values():
                                    if isinstance(u, dict) and u.get("email"):
                                        recipients.append(u.get("email"))
                    except Exception as u_err:
                        print(f"[24/7 ML] Error reading users: {u_err}")

                    try:
                        otp_res = session.get(f"{RTDB_BASE_URL}/auth_otps.json", timeout=6)
                        if otp_res.status_code == 200 and otp_res.json():
                            otp_data = otp_res.json()
                            if isinstance(otp_data, dict):
                                for o in otp_data.values():
                                    if isinstance(o, dict) and o.get("email"):
                                        recipients.append(o.get("email"))
                    except Exception:
                        pass

                    recipients = list(dict.fromkeys([
                        str(r).strip().lower() for r in recipients if r and "@" in str(r)
                    ]))

                    # 2. Persist Anomaly in RTDB
                    anom_payload = {
                        "id": anom_id,
                        "nodeId": "GG-NODE-01",
                        "timestamp": now_iso,
                        "status": "ABNORMAL",
                        "prediction": -1,
                        "anomalyScore": round(score, 5),
                        "message": "24/7 ML Isolation Forest flagged abnormal generation disparity",
                        "inputs": inf_record["inputs"],
                        "metrics": {
                            "acDcRatio": round((ac_power / dc_power), 3) if dc_power > 0 else 0,
                            "tempDisparity": round(mod_temp - amb_temp, 1),
                        },
                        "emailAlertSent": not stop_ml_mails,
                        "alertRecipient": ", ".join(recipients) if not stop_ml_mails else "Suppressed (ML Detection emails stopped via MLDetection page)",
                        "resolved": False,
                        "createdAt": now_iso,
                    }
                    try:
                        session.put(f"{RTDB_BASE_URL}/anomalies/{anom_id}.json", json=anom_payload, timeout=6)
                        session.patch(f"{RTDB_BASE_URL}/nodes/GG-NODE-01.json", json={"status": "CRITICAL"}, timeout=5)
                    except Exception as anom_err:
                        print(f"[24/7 ML] Error writing anomaly to RTDB: {anom_err}")

                    # 3. Create Critical Alert in RTDB
                    alert_id = f"alert_24h_{int(now_epoch * 1000)}"
                    alert_payload = {
                        "id": alert_id,
                        "nodeId": "GG-NODE-01",
                        "type": "ANOMALY_DETECTION",
                        "severity": "CRITICAL",
                        "message": f"ML 24/7 Isolation Forest Alert: Abnormal generation disparity (Score: {score:.4f})",
                        "value": round(score, 4),
                        "threshold": 0.0,
                        "resolved": False,
                        "status": "OPEN",
                        "acknowledged": False,
                        "timestamp": now_iso,
                    }
                    try:
                        session.put(f"{RTDB_BASE_URL}/alerts/{alert_id}.json", json=alert_payload, timeout=6)
                    except Exception:
                        pass

                    if stop_ml_mails:
                        print(f"[24/7 ML Engine] ABNORMAL condition flagged (Score: {score:.5f}), but ML Detection emails are STOPPED in settings. Email suppressed.", flush=True)
                        continue

                    print(f"[24/7 ML Engine] ABNORMAL condition flagged (Score: {score:.5f}). Notifying operators: {recipients}", flush=True)

                    # 4. Dispatch Email to all respected users
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

Dispatched automatically by Grid Guard 24/7 ML Autonomous Engine to: {', '.join(recipients)}"""

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
    Stored in Firebase RTDB &bull; Dispatched to {', '.join(recipients)} &bull; Grid Guard Solar Monitoring
  </div>
</div>"""

                    send_smtp_email(recipients, subject, plain_msg, html_msg)

        except Exception as e:
            print(f"[24/7 ML Loop Error]: {e}", flush=True)

        time.sleep(3.0)


def rtdb_queue_dispatcher():
    """
    Dedicated background worker that polls Firebase RTDB /email_queue and /otp_dispatch_queue
    every 1.5 seconds and dispatches SMTP emails immediately.
    Completely decoupled from telemetry generation to guarantee fast, non-blocking delivery.
    """
    session = requests.Session()
    session.headers.update({"Connection": "close"})
    print("[RTDB Dispatcher] Dedicated Email & OTP queue worker started.", flush=True)

    while True:
        try:
            # 1. Process email_queue
            try:
                res = session.get(f"{RTDB_BASE_URL}/email_queue.json", timeout=6)
                if res.status_code == 200 and res.json():
                    queue_data = res.json()
                    if isinstance(queue_data, dict):
                        for item_id, item in list(queue_data.items()):
                            if not item or not isinstance(item, dict):
                                session.delete(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", timeout=10)
                                continue

                            recipients = item.get("recipients", [])
                            if isinstance(recipients, str):
                                recipients = [r.strip() for r in recipients.split(",") if r.strip()]
                            elif isinstance(recipients, list):
                                recipients = [str(r).strip() for r in recipients if r]

                            subject = item.get("subject", "Grid Guard Notification")
                            message = item.get("message", "")
                            html_msg = item.get("html_message")

                            retries = int(item.get("retries", 0))
                            if recipients and (message or html_msg):
                                safe_subj = str(subject).encode("ascii", errors="replace").decode("ascii")
                                print(f"[RTDB Queue Dispatcher] Processing email {item_id} to {recipients}: {safe_subj}", flush=True)
                                sent = send_smtp_email(recipients, subject, message, html_msg)
                                if sent:
                                    print(f"[RTDB Queue Dispatcher] Successfully sent {item_id}. Removing from queue.", flush=True)
                                    session.delete(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", timeout=10)
                                else:
                                    if retries >= 3:
                                        print(f"[RTDB Queue Dispatcher] Exceeded max retries for {item_id}. Discarding.", flush=True)
                                        session.delete(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", timeout=10)
                                    else:
                                        print(f"[RTDB Queue Dispatcher] Failed sending {item_id} (retry {retries + 1}/3).", flush=True)
                                        session.patch(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", json={"status": "FAILED_RETRY", "retries": retries + 1}, timeout=10)
                            else:
                                session.delete(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", timeout=10)
            except Exception as e:
                print(f"[RTDB Queue Dispatcher - Email Error]: {e}", flush=True)

            # 2. Process otp_dispatch_queue
            try:
                res = session.get(f"{RTDB_BASE_URL}/otp_dispatch_queue.json", timeout=10)
                if res.status_code == 200 and res.json():
                    otp_queue = res.json()
                    if isinstance(otp_queue, dict):
                        for queue_id, otp_item in list(otp_queue.items()):
                            if not otp_item or not isinstance(otp_item, dict):
                                session.delete(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", timeout=10)
                                continue

                            target_email = otp_item.get("email")
                            code = otp_item.get("otp")
                            retries = int(otp_item.get("retries", 0))
                            if target_email and code:
                                print(f"[RTDB Queue Dispatcher] Processing OTP {code} to {target_email}", flush=True)
                                subj = f"Grid Guard Verification Code: {code}"
                                body = f"Hello,\n\nYour 6-digit verification code for Grid Guard Solar Monitoring is: {code}\n\nThis code expires in 5 minutes.\n\nPortal Login: https://gridguardsolarmonitoring.web.app/login\n\nBest regards,\nGrid Guard Security Team"
                                html_body = f"""<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:auto;background:#030712;color:#f8fafc;padding:24px;border-radius:12px;border:1px solid #1e293b;">
                                  <div style="text-align:center;margin-bottom:20px;">
                                    <h2 style="color:#a3e635;margin:0 0 8px 0;font-size:22px;">Grid Guard Security Verification</h2>
                                    <p style="color:#94a3b8;font-size:13px;margin:0;">Solar Array Monitoring & Control Console</p>
                                  </div>
                                  <p style="color:#cbd5e1;font-size:14px;">Your 6-digit one-time verification passcode is:</p>
                                  <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:20px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#f59e0b;font-family:monospace;margin:16px 0;">
                                    {code}
                                  </div>
                                  <p style="color:#64748b;font-size:12px;text-align:center;margin:16px 0 0 0;">
                                    Expires in 5 minutes. If you did not request this, please disregard this email.
                                  </p>
                                </div>"""
                                sent = send_smtp_email([target_email], subj, body, html_body)
                                if sent:
                                    session.delete(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", timeout=10)
                                else:
                                    if retries >= 3:
                                        print(f"[RTDB Queue Dispatcher] Exceeded max retries for OTP {queue_id}. Discarding.", flush=True)
                                        session.delete(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", timeout=10)
                                    else:
                                        session.patch(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", json={"status": "FAILED_RETRY", "retries": retries + 1}, timeout=10)
                            else:
                                session.delete(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", timeout=10)
            except Exception as e:
                print(f"[RTDB Queue Dispatcher - OTP Error]: {e}", flush=True)

        except Exception as loop_e:
            print(f"[RTDB Queue Dispatcher Loop Error]: {loop_e}", flush=True)

        time.sleep(1.5)


# Start daemon background threads
threading.Thread(target=rtdb_background_worker, daemon=True, name="rtdb_telemetry_streamer").start()
threading.Thread(target=rtdb_queue_dispatcher, daemon=True, name="rtdb_queue_dispatcher").start()
threading.Thread(target=autonomous_ml_evaluator_24h, daemon=True, name="autonomous_ml_evaluator_24h").start()


@app.get("/api/rtdb/status")
def get_rtdb_status():
    return {
        "status": rtdb_sync_state["status"],
        "url": rtdb_sync_state["url"],
        "ticks": rtdb_sync_state["ticks"],
        "last_write": rtdb_sync_state["last_write"],
        "last_error": rtdb_sync_state["last_error"],
        "seeded": rtdb_sync_state["seeded"],
    }


@app.post("/api/rtdb/seed")
def manual_rtdb_seed():
    success = seed_rtdb_data()
    return {
        "success": success,
        "status": rtdb_sync_state["status"],
        "last_error": rtdb_sync_state["last_error"],
    }


@app.get("/api/ml/email-settings")
def get_ml_email_settings():
    session = requests.Session()
    session.headers.update({"Connection": "close"})
    try:
        res = session.get(f"{RTDB_BASE_URL}/systemSettings/stop_ml_detection_mails.json", timeout=3)
        stopped = (res.status_code == 200 and res.json() is True)
        return {"stop_ml_detection_mails": stopped}
    except Exception as e:
        return {"stop_ml_detection_mails": False, "error": str(e)}


@app.post("/api/ml/toggle-emails")
def toggle_ml_emails(payload: dict = None):
    session = requests.Session()
    session.headers.update({"Connection": "close"})
    stopped = True
    if payload and "stop_ml_detection_mails" in payload:
        stopped = bool(payload["stop_ml_detection_mails"])
    try:
        session.put(f"{RTDB_BASE_URL}/systemSettings/stop_ml_detection_mails.json", json=stopped, timeout=3)
        session.patch(f"{RTDB_BASE_URL}/system.json", json={"stopMlDetectionMails": stopped}, timeout=3)
        return {"success": True, "stop_ml_detection_mails": stopped}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)


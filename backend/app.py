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

    if not smtp_user or not smtp_pass:
        print("[SMTP Error] SMTP_USER or SMTP_PASS not set in environment.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = Header(smtp_from, "utf-8")
        msg["To"] = ", ".join(to_addrs)

        part1 = MIMEText(text_content, "plain", "utf-8")
        msg.attach(part1)

        if html_content:
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part2)

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_addrs, msg.as_string())
        server.quit()
        print(f"[SMTP Success] Email sent to {to_addrs}")
        return True
    except Exception as e:
        print(f"[SMTP Exception] Error sending email: {e}")
        return False


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

    while True:
        try:
            tick_count += 1
            t = tick_count * 0.1
            bus_voltage = round(230.4 + math.sin(t * 0.7) * 0.6 + (secrets.randbelow(100) / 100.0 - 0.5) * 0.4, 1)
            power_kw = round(4.82 + math.sin(t * 0.5) * 0.15 + (secrets.randbelow(100) / 100.0 - 0.5) * 0.08, 2)
            energy_acc = round(energy_acc + (power_kw / 3600.0), 3)
            power_factor = 0.985
            current_a = round((power_kw * 1000.0) / (bus_voltage * power_factor), 1)
            temperature = round(34.0 + math.sin(t * 0.2) * 1.5, 1)
            irradiance = round(max(750, min(1000, 860 + math.sin(t * 0.3) * 30)))
            frequency = round(50.02 + math.sin(t * 1.1) * 0.02, 2)
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            telemetry_data = {
                "nodeId": "GG-NODE-01",
                "timestamp": now_iso,
                "voltage": bus_voltage,
                "current": current_a,
                "power": power_kw,
                "energy": energy_acc,
                "temperature": temperature,
                "irradiance": irradiance,
                "efficiency": 95.2,
                "frequency": frequency,
                "powerFactor": power_factor,
                "status": "ONLINE",
            }

            res = requests.put(
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
                        "power": power_kw,
                        "energy": energy_acc,
                        "temperature": temperature,
                        "lastSeen": now_iso,
                        "status": "ONLINE",
                    }
                    requests.patch(f"{RTDB_BASE_URL}/nodes/GG-NODE-01.json", json=node_update, timeout=3)

                # Process email_queue from Firebase RTDB (every 2 ticks)
                if tick_count % 2 == 0:
                    try:
                        q_res = requests.get(f"{RTDB_BASE_URL}/email_queue.json", timeout=3)
                        if q_res.status_code == 200 and q_res.json():
                            queue_data = q_res.json()
                            for item_id, item in list(queue_data.items()):
                                if not item or item.get("status") == "SENT":
                                    continue
                                recipients = item.get("recipients", [])
                                subject = item.get("subject", "Grid Guard Notification")
                                message = item.get("message", "")
                                html_msg = item.get("html_message")
                                if recipients and message:
                                    safe_subj = str(subject).encode("ascii", errors="replace").decode("ascii")
                                    print(f"[RTDB Email Worker] Dispatching queued email to {recipients}: {safe_subj}")
                                    sent = send_smtp_email(recipients, subject, message, html_msg)
                                    if sent:
                                        requests.delete(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", timeout=3)
                                    else:
                                        requests.patch(f"{RTDB_BASE_URL}/email_queue/{item_id}.json", json={"status": "FAILED_RETRY"}, timeout=3)
                    except Exception as q_err:
                        safe_err = str(q_err).encode("ascii", errors="replace").decode("ascii")
                        print(f"[RTDB Email Worker Error] {safe_err}")

                # Process otp_dispatch_queue from Firebase RTDB (every 2 ticks)
                if tick_count % 2 == 1:
                    try:
                        otp_res = requests.get(f"{RTDB_BASE_URL}/otp_dispatch_queue.json", timeout=3)
                        if otp_res.status_code == 200 and otp_res.json():
                            otp_queue = otp_res.json()
                            for queue_id, otp_item in list(otp_queue.items()):
                                if not otp_item or otp_item.get("status") == "SENT":
                                    continue
                                target_email = otp_item.get("email")
                                code = otp_item.get("otp")
                                if target_email and code:
                                    print(f"[RTDB OTP Worker] Sending queued OTP {code} to {target_email}")
                                    subj = f"Grid Guard Verification Code: {code}"
                                    body = f"Hello,\n\nYour 6-digit verification code for Grid Guard Solar Monitoring is: {code}\n\nThis code expires in 5 minutes.\n\nPortal Login: https://gridguardsolarmonitoring.web.app/login\n\nBest regards,\nGrid Guard Security Team"
                                    html_body = f"""<div style="font-family:sans-serif;max-width:500px;margin:auto;background:#030712;color:#fff;padding:24px;border-radius:12px;border:1px solid #1e293b;">
                                      <h2 style="color:#a3e635;margin-top:0;">Grid Guard Verification</h2>
                                      <p style="color:#cbd5e1;">Your 6-digit one-time passcode:</p>
                                      <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:6px;color:#f59e0b;font-family:monospace;">
                                        {code}
                                      </div>
                                      <p style="color:#64748b;font-size:12px;margin-top:16px;">Expires in 5 minutes. If you did not request this, please disregard.</p>
                                    </div>"""
                                    sent = send_smtp_email([target_email], subj, body, html_body)
                                    if sent:
                                        requests.delete(f"{RTDB_BASE_URL}/otp_dispatch_queue/{queue_id}.json", timeout=3)
                    except Exception as otp_q_err:
                        print(f"[RTDB OTP Worker Error] {otp_q_err}")
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


# Start daemon background thread
threading.Thread(target=rtdb_background_worker, daemon=True, name="rtdb_telemetry_streamer").start()


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)


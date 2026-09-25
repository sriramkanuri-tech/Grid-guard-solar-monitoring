# Grid Guard Solar Monitoring — Production Control System

**Grid Guard** is an enterprise-grade solar microgrid monitoring and security platform. It provides high-frequency real-time telemetry ingest, automated grid stability protection, machine-learning anomaly detection via Isolation Forest, multi-factor authentication (TOTP QR Code), and an administrative control center.

---

## 🌟 Key Architecture & Capabilities

### 1. Real-Time Telemetry & Firebase Integration
- **Direct Realtime Database Sync**: Powered by Firebase Realtime Database (`https://gridguardsolarmonitoring-default-rtdb.firebaseio.com/`).
- **1-Second Telemetry Pipeline**: Continuously streams DC/AC power, voltage, current, inverter temperature, frequency, power factor, and irradiance.
- **Hardware Telemetry Injection**: Provision and stream live metrics to individual solar nodes with sub-second latency.
- **Honest Telemetry State**: No static mock figures; when nodes are offline, the console displays "NO LIVE DATA" / "NODE OFFLINE".

### 2. Live Presence Tracking & Statistics
- **Connection Handshake**: Tracks active operators using Firebase `.info/connected` with automated `onDisconnect()` teardown.
- **Real-Time Member Counters**: Accurately computes live online operators versus total registered members.

### 3. Identity, Access Management & RBAC
- **Dedicated Primary Administrator**: `sriramkanuri4@gmail.com` with role `"admin"`.
- **Role-Based Access Control**:
  - `AdminRoute` & `AdminLayout`: Non-admins attempting to access `/admin/*` are blocked and redirected.
  - Granular permissions for user provisioning, node decommissioning, and alert resolution.
- **Strict Database Security**: Enforces Firebase RTDB rules preventing members from modifying their own roles.

### 4. High-Assurance Authentication & MFA
- **Passwordless 6-Digit Email OTP**: Operators can sign in without passwords by receiving a secure 6-digit OTP dispatched via Gmail SMTP.
- **Standards-Compliant TOTP MFA**: Scannable QR code setup in Account Settings compatible with Google Authenticator, Microsoft Authenticator, and Authy.

### 5. Automated Communications & Notifications
- **Gmail SMTP Relay**: Dispatches alerts, OTPs, and broadcast notices using Gmail SMTP (`sriramkanuri45@gmail.com`).
- **Telegram Bot Integration**: Broadcasts CRITICAL microgrid anomalies directly to operator response channels.

### 6. Isolation Forest Machine Learning Inference Engine
- **Pre-Trained Joblib Model**: Evaluates solar readings (`DC_POWER`, `AC_POWER`, `AMBIENT_TEMPERATURE`, `MODULE_TEMPERATURE`, `IRRADIATION`, `hour`) to compute decision function scores and detect generation anomalies.
- **Dual Endpoints**: Accessible via `POST /api/anomaly/predict` and `POST /predict`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ or v20+
- **Python**: 3.10+ (tested with 3.13)
- **Git**

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sriramkanuri-tech/Grid-guard-solar-monitoring.git
   cd Grid-guard-solar-monitoring
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```
   The client will boot at `http://localhost:5174/` (or `http://localhost:5173/`).

3. **Backend & ML Microservice Setup**:
   ```bash
   # In project root:
   pip install -r requirements.txt
   python app.py
   ```
   The FastAPI server will boot at `http://127.0.0.1:8000/`.

---

## 🔒 Environment Configuration

Create a `.env` file in the project root:

```env
# Primary Administrator
ADMIN_EMAIL=sriramkanuri4@gmail.com
ADMIN_INITIAL_PASSWORD=GridGuardAdmin2026!

# SMTP Configuration (Gmail Relay)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sriramkanuri45@gmail.com
SMTP_PASS=pkto juno ctbn srib
SMTP_FROM=Grid Guard Solar <sriramkanuri45@gmail.com>

# Telegram Alerting (Optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Endpoints
VITE_BACKEND_API_URL=http://localhost:8000
VITE_ML_API_URL=http://localhost:8000
```

---

## 🛡️ Admin Root Control Center

Verified administrators (`sriramkanuri4@gmail.com` or `role: "admin"`) have access to `/admin`:

- **`/admin/dashboard`**: System telemetry, live active member counters, active alerts, and node telemetry overview.
- **`/admin/members`**: Directory of all registered operators, provision new members with invitation emails, activate/deactivate accounts.
- **`/admin/nodes`**: Provision and manage physical/simulated solar monitoring nodes.
- **`/admin/telemetry`**: Live stream inspector and hardware packet injector.
- **`/admin/alerts`**: Safety control room with acknowledge/resolve workflows and Telegram dispatch.
- **`/admin/emails`**: Broadcast platform maintenance advisories or urgent bulletins via SMTP.
- **`/admin/audit`**: Chronological audit ledger with one-click CSV export.
- **`/admin/system`**: Real-time diagnostic monitor for Vite, FastAPI, Firebase RTDB, and ML Inference.

---

## 🧪 Testing & Verification

- **Production Build Check**:
  ```bash
  npm run build
  ```
- **Backend Health Check**:
  ```bash
  curl http://localhost:8000/api/health
  ```
- **ML Inference Test**:
  ```bash
  curl -X POST http://localhost:8000/api/anomaly/predict \
    -H "Content-Type: application/json" \
    -d "{\"DC_POWER\": 2500.0, \"AC_POWER\": 2400.0, \"AMBIENT_TEMPERATURE\": 28.0, \"MODULE_TEMPERATURE\": 35.0, \"IRRADIATION\": 800.0, \"hour\": 12.0}"
  ```

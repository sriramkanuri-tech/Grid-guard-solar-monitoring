import os
import uuid
from datetime import datetime, timezone
from typing import Generator
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Boolean,
    DateTime,
    Numeric,
    Float,
    Integer,
    BigInteger,
    Text,
    ForeignKey,
    text
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

Base = declarative_base()

def get_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/Gridguardsolarmonitoring")
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url

engine = create_engine(
    get_database_url(),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================
# 1. USERS
# ============================================================
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=True)
    name = Column(String(150), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(String(30), nullable=False, default="user")
    profile_image = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    mfa_secret = Column(String(128), nullable=True)
    mfa_enabled = Column(Boolean, nullable=False, default=False)

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    presence = relationship("Presence", back_populates="user", cascade="all, delete-orphan")
    resolved_alerts = relationship("Alert", back_populates="resolver")
    audit_logs = relationship("AuditLog", back_populates="user")

# ============================================================
# 2. USER SESSIONS
# ============================================================
class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(255), unique=True, nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    login_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    logout_at = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="sessions")

# ============================================================
# 3. SOLAR NODES
# ============================================================
class SolarNode(Base):
    __tablename__ = "solar_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(255), nullable=True)
    rated_output_kw = Column(Numeric(12, 3), nullable=True)
    connection_protocol = Column(String(50), nullable=True)
    ip_address = Column(INET, nullable=True)
    device_type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="offline")
    firmware_version = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime(timezone=True), nullable=True)

    sensors = relationship("Sensor", back_populates="node", cascade="all, delete-orphan")
    readings = relationship("SensorReading", back_populates="node", cascade="all, delete-orphan")
    grid_telemetry = relationship("GridTelemetry", back_populates="node", cascade="all, delete-orphan")
    energy_analytics = relationship("EnergyAnalytics", back_populates="node", cascade="all, delete-orphan")
    battery_analytics = relationship("BatteryAnalytics", back_populates="node", cascade="all, delete-orphan")
    ml_detections = relationship("MLDetection", back_populates="node")
    alerts = relationship("Alert", back_populates="node")

# ============================================================
# 4. SENSORS
# ============================================================
class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id = Column(String(100), unique=True, nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=True)
    sensor_type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="offline")
    unit = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime(timezone=True), nullable=True)

    node = relationship("SolarNode", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")
    ml_detections = relationship("MLDetection", back_populates="sensor")
    alerts = relationship("Alert", back_populates="sensor")

# ============================================================
# 5. SENSOR READINGS
# ============================================================
class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensors.id", ondelete="CASCADE"), nullable=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    power_kw = Column(Float, nullable=True)
    voltage_v = Column(Float, nullable=True)
    current_a = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    humidity_percent = Column(Float, nullable=True)
    pressure_hpa = Column(Float, nullable=True)
    irradiance_w_m2 = Column(Float, nullable=True)

    frequency_hz = Column(Float, nullable=True)
    power_factor = Column(Float, nullable=True)

    energy_kwh = Column(Float, nullable=True)
    status = Column(String(50), nullable=True)
    additional_data = Column(JSONB, nullable=True)

    node = relationship("SolarNode", back_populates="readings")
    sensor = relationship("Sensor", back_populates="readings")

# ============================================================
# 6. GRID TELEMETRY
# ============================================================
class GridTelemetry(Base):
    __tablename__ = "grid_telemetry"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    grid_voltage_v = Column(Float, nullable=True)
    grid_current_a = Column(Float, nullable=True)
    grid_frequency_hz = Column(Float, nullable=True)
    power_factor = Column(Float, nullable=True)

    phase_voltage = Column(Float, nullable=True)
    phase_current = Column(Float, nullable=True)

    interlock_state = Column(String(50), nullable=True)
    grid_status = Column(String(50), nullable=True)
    additional_data = Column(JSONB, nullable=True)

    node = relationship("SolarNode", back_populates="grid_telemetry")

# ============================================================
# 7. ENERGY ANALYTICS
# ============================================================
class EnergyAnalytics(Base):
    __tablename__ = "energy_analytics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    solar_power_kw = Column(Float, nullable=True)
    energy_generated_kwh = Column(Float, nullable=True)
    average_power_kw = Column(Float, nullable=True)
    peak_power_kw = Column(Float, nullable=True)

    grid_voltage_v = Column(Float, nullable=True)
    battery_soc_percent = Column(Float, nullable=True)
    inverter_efficiency_percent = Column(Float, nullable=True)

    direct_grid_export_kwh = Column(Float, nullable=True)
    battery_storage_kwh = Column(Float, nullable=True)
    parasitic_loss_kwh = Column(Float, nullable=True)

    period_type = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    node = relationship("SolarNode", back_populates="energy_analytics")

# ============================================================
# 8. BATTERY ANALYTICS
# ============================================================
class BatteryAnalytics(Base):
    __tablename__ = "battery_analytics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    battery_soc_percent = Column(Float, nullable=True)
    battery_voltage_v = Column(Float, nullable=True)
    battery_current_a = Column(Float, nullable=True)
    battery_power_kw = Column(Float, nullable=True)

    charge_rate = Column(Float, nullable=True)
    discharge_rate = Column(Float, nullable=True)

    battery_temperature_c = Column(Float, nullable=True)
    battery_health_percent = Column(Float, nullable=True)

    operating_state = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    node = relationship("SolarNode", back_populates="battery_analytics")

# ============================================================
# 9. ML DETECTIONS
# ============================================================
class MLDetection(Base):
    __tablename__ = "ml_detections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="SET NULL"), nullable=True)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    dc_power_w = Column(Float, nullable=True)
    ac_power_w = Column(Float, nullable=True)
    ambient_temperature_c = Column(Float, nullable=True)
    module_temperature_c = Column(Float, nullable=True)
    irradiation_w_m2 = Column(Float, nullable=True)

    anomaly_score = Column(Float, nullable=True)
    prediction = Column(Integer, nullable=True)

    detection_status = Column(String(30), nullable=True)
    model_name = Column(String(150), nullable=True)
    model_version = Column(String(100), nullable=True)
    confidence = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    node = relationship("SolarNode", back_populates="ml_detections")
    sensor = relationship("Sensor", back_populates="ml_detections")
    alerts = relationship("Alert", back_populates="ml_detection")

# ============================================================
# 10. ALERTS
# ============================================================
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("solar_nodes.id", ondelete="SET NULL"), nullable=True)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    ml_detection_id = Column(BigInteger, ForeignKey("ml_detections.id", ondelete="SET NULL"), nullable=True)

    alert_type = Column(String(100), nullable=False)
    severity = Column(String(30), nullable=False)

    title = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)

    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)

    status = Column(String(30), nullable=False, default="ACTIVE")

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    node = relationship("SolarNode", back_populates="alerts")
    sensor = relationship("Sensor", back_populates="alerts")
    ml_detection = relationship("MLDetection", back_populates="alerts")
    resolver = relationship("User", back_populates="resolved_alerts")

# ============================================================
# 11. AUDIT LOGS
# ============================================================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    event_metadata = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")

# ============================================================
# 12. PRESENCE
# ============================================================
class Presence(Base):
    __tablename__ = "presence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(255), nullable=True)
    online = Column(Boolean, nullable=False, default=False)
    last_seen = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="presence")

# ============================================================
# 13. SYSTEM STATUS
# ============================================================
class SystemStatus(Base):
    __tablename__ = "system_status"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    hardware_status = Column(String(50), nullable=True)
    api_status = Column(String(50), nullable=True)
    database_status = Column(String(50), nullable=True)
    ml_server_status = Column(String(50), nullable=True)
    active_nodes = Column(Integer, default=0)
    active_sensors = Column(Integer, default=0)
    system_state = Column(String(50), nullable=True)
    additional_data = Column(JSONB, nullable=True)

# Helper function to seed initial nodes and sensors if not present
def initialize_database_data():
    db = SessionLocal()
    try:
        # 1. Ensure default admin user has correct role
        admin_email = os.getenv("ADMIN_EMAIL", "sriramkanuri4@gmail.com")
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="Sriram Kanuri",
                email=admin_email,
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Check solar nodes
        node1 = db.query(SolarNode).filter(SolarNode.node_id == "GG-NODE-01").first()
        if not node1:
            node1 = SolarNode(
                node_id="GG-NODE-01",
                name="Substation Alpha Array",
                location="Main Substation Sector 4",
                rated_output_kw=5.0,
                connection_protocol="MQTT/TLS",
                status="ONLINE",
                firmware_version="v2.4.1-prod",
                last_seen=datetime.now(timezone.utc)
            )
            db.add(node1)
            db.commit()
            db.refresh(node1)

        node2 = db.query(SolarNode).filter(SolarNode.node_id == "GG-NODE-02").first()
        if not node2:
            node2 = SolarNode(
                node_id="GG-NODE-02",
                name="Rooftop Commercial PV",
                location="Building C Industrial Roof",
                rated_output_kw=3.5,
                connection_protocol="Modbus/TCP",
                status="ONLINE",
                firmware_version="v2.4.1-prod",
                last_seen=datetime.now(timezone.utc)
            )
            db.add(node2)
            db.commit()
            db.refresh(node2)

        # 3. Check sensors
        sensor1 = db.query(Sensor).filter(Sensor.sensor_id == "SN-0001").first()
        if not sensor1 and node1:
            sensor1 = Sensor(
                sensor_id="SN-0001",
                node_id=node1.id,
                name="Main Solar String Inverter A",
                sensor_type="inverter",
                location="Array Shed North",
                status="normal",
                unit="kW",
                last_seen=datetime.now(timezone.utc)
            )
            db.add(sensor1)
            db.commit()

        sensor2 = db.query(Sensor).filter(Sensor.sensor_id == "SN-0002").first()
        if not sensor2 and node1:
            sensor2 = Sensor(
                sensor_id="SN-0002",
                node_id=node1.id,
                name="Rooftop Secondary PV Pod",
                sensor_type="pv_module",
                location="Building C Industrial Roof",
                status="normal",
                unit="kW",
                last_seen=datetime.now(timezone.utc)
            )
            db.add(sensor2)
            db.commit()

        # 4. Initial system status entry if none exists
        latest_status = db.query(SystemStatus).order_by(SystemStatus.timestamp.desc()).first()
        if not latest_status:
            init_status = SystemStatus(
                hardware_status="OPTIMAL",
                api_status="ONLINE",
                database_status="POSTGRESQL_18_CONNECTED",
                ml_server_status="ARMED",
                active_nodes=2,
                active_sensors=2,
                system_state="OPTIMAL",
                additional_data={
                    "maintenanceMode": False,
                    "stopMlDetectionMails": False,
                    "version": "2.4.0-prod"
                }
            )
            db.add(init_status)
            db.commit()

    except Exception as e:
        db.rollback()
        print(f"[DB Init Error] {e}")
    finally:
        db.close()

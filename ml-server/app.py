from pathlib import Path
from typing import Any

import joblib  # type: ignore[import-untyped]
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Grid Guard ML API")

# Allow existing frontend origins (Vite dev server)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOUR trained model
try:
    bundle: dict[str, Any] = joblib.load("grid_guard_solar_model.joblib")
except FileNotFoundError:
    model_path = Path(__file__).resolve().parent / "grid_guard_solar_model.joblib"
    bundle = joblib.load(model_path)

model = bundle["model"]
features = bundle["features"]


class SolarReading(BaseModel):
    DC_POWER: float
    AC_POWER: float
    AMBIENT_TEMPERATURE: float
    MODULE_TEMPERATURE: float
    IRRADIATION: float
    hour: float = 12.0


@app.get("/")
def home():
    return {
        "message": "Grid Guard ML API is running",
        "model": "Isolation Forest"
    }


@app.post("/predict")
def predict(data: SolarReading):

    reading = data.model_dump()

    hour = reading.pop("hour")

    df = pd.DataFrame([reading])

    # Time features
    df["HOUR_SIN"] = np.sin(
        2 * np.pi * hour / 24
    )

    df["HOUR_COS"] = np.cos(
        2 * np.pi * hour / 24
    )

    # Electrical relationships
    dc_power = df["DC_POWER"].iloc[0]
    ac_power = df["AC_POWER"].iloc[0]
    irradiation = df["IRRADIATION"].iloc[0]

    if dc_power > 1:
        df["AC_DC_RATIO"] = ac_power / dc_power
    else:
        df["AC_DC_RATIO"] = 0

    if irradiation > 0.05:
        df["POWER_PER_IRRADIANCE"] = (
            ac_power / irradiation
        )
    else:
        df["POWER_PER_IRRADIANCE"] = 0

    df = df.replace(
        [np.inf, -np.inf],
        np.nan
    ).fillna(0)

    # Run the trained model
    prediction = int(
        model.predict(df[features])[0]
    )

    anomaly_score = float(
        model.decision_function(df[features])[0]
    )

    if prediction == 1:
        status = "NORMAL"
    else:
        status = "ABNORMAL"

    return {
        "status": status,
        "prediction": prediction,
        "anomaly_score": round(anomaly_score, 5),
        "message": (
            "Solar system operating normally"
            if status == "NORMAL"
            else "Abnormal solar behavior detected"
        )
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
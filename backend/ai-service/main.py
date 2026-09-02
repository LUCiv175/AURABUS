import logging
import os
import threading
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
import xgboost as xgb
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from trainer import DELAY_MAX, DELAY_MIN, FEATURES, MODEL_PATH, retrain_model

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("aurabus.ai")

MAX_STOPS_PER_REQUEST = 200

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
if not INTERNAL_API_KEY:
    log.warning("INTERNAL_API_KEY is not set; all callers share the public rate limit.")


class Brain:
    def __init__(self):
        self._booster: Optional[xgb.Booster] = None
        self._info: dict = {}
        self._lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._booster is not None

    @property
    def info(self) -> dict:
        return dict(self._info)

    def load(self) -> bool:
        if not MODEL_PATH.exists():
            log.warning("No model at %s.", MODEL_PATH)
            return False

        booster = xgb.Booster()
        try:
            booster.load_model(str(MODEL_PATH))
        except Exception as exc:
            log.error("Model at %s is unreadable: %s", MODEL_PATH, exc)
            return False

        info = booster.attributes()
        if info.get("target") != "delta_direct":
            log.error("Model at %s has an incompatible target (%r).", MODEL_PATH, info.get("target"))
            return False
        if info.get("features") != ",".join(FEATURES):
            log.error("Model features %r do not match %r", info.get("features"), FEATURES)
            return False

        with self._lock:
            self._booster = booster
            self._info = info
        log.info(
            "Model loaded (trained_at=%s, MAE=%s min, baseline=%s min)",
            info.get("trained_at"),
            info.get("mae"),
            info.get("baseline_mae"),
        )
        return True

    def predict(self, rows: np.ndarray) -> np.ndarray:
        booster = self._booster
        if booster is None:
            raise RuntimeError("model not loaded")
        return booster.inplace_predict(rows)


brain = Brain()
scheduler = BackgroundScheduler()


def rate_limit_key(request: Request) -> str:
    if INTERNAL_API_KEY and request.headers.get("X-Internal-Server-Key") == INTERNAL_API_KEY:
        return f"internal-{uuid.uuid4()}"
    return get_remote_address(request)


class StopInfo(BaseModel):
    stop_encoded: int
    hour: int
    day_of_week: int = Field(ge=0, le=6)
    directionId: int = 0
    stops_ahead: int = Field(ge=1)
    minutes_ahead: float = Field(ge=0)

    @field_validator("hour")
    @classmethod
    def normalize_hour(cls, value: int) -> int:
        # Timetables run to 24:xx-27:xx past midnight.
        if not 0 <= value <= 47:
            raise ValueError("hour must be between 0 and 47")
        return value % 24


class TripRequest(BaseModel):
    route_encoded: int
    current_delay: float
    current_stop_encoded: int
    future_stops: List[StopInfo] = Field(min_length=1, max_length=MAX_STOPS_PER_REQUEST)


def scheduled_retraining():
    if retrain_model():
        brain.load()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        scheduled_retraining,
        CronTrigger(day_of_week="sun", hour=4, minute=0),
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    scheduler.start()

    if not brain.load():
        log.info("Running initial training...")
        scheduled_retraining()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title="AuraBus AI", lifespan=lifespan)

limiter = Limiter(key_func=rate_limit_key, default_limits=["30/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.get("/")
@app.get("/health")
def health(request: Request):
    return {
        "status": "ok" if brain.ready else "degraded",
        "model_loaded": brain.ready,
        "model": brain.info,
    }


@app.post("/predict")
def predict(request: Request, payload: TripRequest):
    if not brain.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded. Cannot make predictions.",
        )

    stops = payload.future_stops
    current_delay = float(min(max(payload.current_delay, DELAY_MIN), DELAY_MAX))

    rows = np.empty((len(stops), len(FEATURES)), dtype=np.float32)
    for i, stop in enumerate(stops):
        rows[i] = (
            payload.route_encoded,
            payload.current_stop_encoded,
            stop.stop_encoded,
            stop.directionId,
            stop.hour,
            stop.day_of_week,
            current_delay,
            stop.stops_ahead,
            stop.minutes_ahead,
        )

    deltas = brain.predict(rows)

    predictions = []
    for stop, delta in zip(stops, deltas):
        # Measured: the model loses to "delay holds" at one stop ahead.
        predicted = current_delay if stop.stops_ahead <= 1 else current_delay + float(delta)
        predictions.append(
            {
                "stop_encoded": stop.stop_encoded,
                "predicted_delay": int(round(min(max(predicted, DELAY_MIN), DELAY_MAX))),
            }
        )

    return {"predictions": predictions}

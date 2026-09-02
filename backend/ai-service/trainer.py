import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConfigurationError
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

load_dotenv()

log = logging.getLogger("aurabus.trainer")

MODEL_PATH = Path(os.getenv("MODEL_PATH", "aurabus_brain.json"))

FEATURES = [
    "route_encoded",
    "origin_stop_encoded",
    "stop_encoded",
    "directionId",
    "hour",
    "day_of_week",
    "current_delay",
    "stops_ahead",
    "minutes_ahead",
]

LOCAL_TZ = os.getenv("TIMETABLE_TZ", "Europe/Rome")

# Minutes, not seconds.
DELAY_MIN = int(os.getenv("DELAY_MIN", -30))
DELAY_MAX = int(os.getenv("DELAY_MAX", 180))

HORIZONS = (1, 2, 3, 5, 8, 12, 20)
MAX_MINUTES_AHEAD = 180

MIN_ROWS_PER_RUN = 4

MIN_TRAINING_PAIRS = int(os.getenv("MIN_TRAINING_PAIRS", 5000))
MAX_TRAINING_PAIRS = int(os.getenv("MAX_TRAINING_PAIRS", 3_000_000))
VALIDATION_FRACTION = 0.2


def get_db():
    uri = (os.getenv("MONGO_URI") or "").strip()
    if not uri:
        raise RuntimeError("MONGO_URI is not set")

    client = MongoClient(uri, serverSelectionTimeoutMS=10_000, tz_aware=True)

    name = (os.getenv("MONGO_DB") or "").strip()
    if name:
        return client[name]
    try:
        return client.get_default_database()
    except ConfigurationError:
        # Same fallback Mongoose gives the API for a path-less URI.
        log.warning("MONGO_URI has no database path, falling back to 'test'")
        return client["test"]


def fetch_metrics(db) -> pd.DataFrame:
    cursor = db["tripmetrics"].find(
        {},
        {
            "_id": 0,
            "timestamp": 1,
            "delay": 1,
            "metadata.routeId": 1,
            "metadata.stopId": 1,
            "metadata.directionId": 1,
            "metadata.tripId": 1,
        },
    )
    return pd.json_normalize(list(cursor))


def _clean(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.rename(
        columns={
            "metadata.routeId": "route_encoded",
            "metadata.stopId": "stop_encoded",
            "metadata.directionId": "directionId",
            "metadata.tripId": "tripId",
        }
    )

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    for col in ("route_encoded", "stop_encoded", "directionId", "delay"):
        df[col] = pd.to_numeric(df.get(col), errors="coerce")
    df["directionId"] = df["directionId"].fillna(0)

    df = df.dropna(
        subset=["timestamp", "tripId", "route_encoded", "stop_encoded", "delay"]
    )
    df = df[df["delay"].between(DELAY_MIN, DELAY_MAX)]
    if df.empty:
        return df

    local = df["timestamp"].dt.tz_convert(LOCAL_TZ)
    df["hour"] = local.dt.hour
    df["day_of_week"] = local.dt.dayofweek
    # A tripId repeats daily, so a run is one tripId on one service date.
    df["run"] = df["tripId"].astype(str) + "|" + local.dt.date.astype(str)

    df = df.sort_values(["run", "timestamp"])
    sizes = df.groupby("run")["delay"].transform("size")
    return df[sizes >= MIN_ROWS_PER_RUN]


def build_pairs(raw: pd.DataFrame) -> pd.DataFrame:
    df = _clean(raw)
    if df.empty:
        return df

    frames = []
    grouped = df.groupby("run", sort=False)
    for horizon in HORIZONS:
        pair = df.copy()
        pair["origin_stop_encoded"] = pair["stop_encoded"]
        pair["current_delay"] = pair["delay"]
        pair["stop_encoded"] = grouped["stop_encoded"].shift(-horizon)
        pair["target_delay"] = grouped["delay"].shift(-horizon)
        pair["target_time"] = grouped["timestamp"].shift(-horizon)
        pair["stops_ahead"] = horizon
        frames.append(
            pair.dropna(subset=["stop_encoded", "target_delay", "target_time"])
        )

    pairs = pd.concat(frames, ignore_index=True)
    pairs["minutes_ahead"] = (
        pairs["target_time"] - pairs["timestamp"]
    ).dt.total_seconds() / 60.0
    pairs = pairs[pairs["minutes_ahead"].between(0, MAX_MINUTES_AHEAD)]
    pairs["target"] = pairs["target_delay"] - pairs["current_delay"]

    if len(pairs) > MAX_TRAINING_PAIRS:
        pairs = pairs.sample(MAX_TRAINING_PAIRS, random_state=42)

    return pairs.sort_values("timestamp")


def train(pairs: pd.DataFrame):
    split_at = pairs["timestamp"].quantile(1 - VALIDATION_FRACTION)
    train_df = pairs[pairs["timestamp"] < split_at]
    val_df = pairs[pairs["timestamp"] >= split_at]

    if train_df.empty or val_df.empty:
        raise RuntimeError(
            f"Not enough time span to split: {len(train_df)} train / {len(val_df)} val"
        )

    model = xgb.XGBRegressor(
        n_estimators=800,
        learning_rate=0.05,
        max_depth=8,
        min_child_weight=20,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=40,
        eval_metric="mae",
        random_state=42,
        n_jobs=os.cpu_count() or 1,
    )
    model.fit(
        train_df[FEATURES],
        train_df["target"],
        eval_set=[(val_df[FEATURES], val_df["target"])],
        verbose=False,
    )

    predicted = val_df["current_delay"] + model.predict(val_df[FEATURES])
    actual = val_df["target_delay"]

    metrics = {
        "pairs": len(pairs),
        "val_pairs": len(val_df),
        "mae": float(mean_absolute_error(actual, predicted)),
        "rmse": float(root_mean_squared_error(actual, predicted)),
        "baseline_mae": float(mean_absolute_error(actual, val_df["current_delay"])),
        "best_iteration": int(model.best_iteration),
    }

    per_horizon = {}
    for horizon, group in val_df.groupby("stops_ahead"):
        base = mean_absolute_error(group["target_delay"], group["current_delay"])
        got = mean_absolute_error(
            group["target_delay"], group["current_delay"] + model.predict(group[FEATURES])
        )
        per_horizon[int(horizon)] = (base, got)

    booster = model.get_booster()
    booster.feature_names = list(FEATURES)
    return booster, metrics, per_horizon


def save_model(booster, metrics) -> None:
    booster.set_attr(
        target="delta_direct",
        units="minutes",
        features=",".join(FEATURES),
        trained_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **{k: str(v) for k, v in metrics.items()},
    )

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=MODEL_PATH.parent, suffix=".json")
    os.close(fd)
    try:
        booster.save_model(tmp)
        os.replace(tmp, MODEL_PATH)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def retrain_model() -> bool:
    try:
        raw = fetch_metrics(get_db())
    except Exception as exc:
        log.error("Cannot read training data: %s", exc)
        return False

    if raw.empty:
        log.warning("No trip metrics found.")
        return False

    newest = pd.to_datetime(raw["timestamp"], utc=True, errors="coerce").max()
    age_days = (pd.Timestamp.now(tz="UTC") - newest).days
    if age_days > 7:
        log.warning(
            "Newest metric is %d days old (%s).", age_days, newest.date()
        )

    pairs = build_pairs(raw)
    if len(pairs) < MIN_TRAINING_PAIRS:
        log.warning(
            "Only %d usable pairs, need %d.", len(pairs), MIN_TRAINING_PAIRS
        )
        return False

    try:
        booster, metrics, per_horizon = train(pairs)
    except Exception as exc:
        log.error("Training failed: %s", exc)
        return False

    log.info(
        "Validation MAE %.2f min vs baseline %.2f min (%d pairs, %d rounds)",
        metrics["mae"],
        metrics["baseline_mae"],
        metrics["val_pairs"],
        metrics["best_iteration"],
    )
    for horizon, (base, got) in sorted(per_horizon.items()):
        log.info(
            "  %2d stops ahead: %.2f -> %.2f min (%+.0f%%)",
            horizon,
            base,
            got,
            (1 - got / base) * 100 if base else 0.0,
        )

    if metrics["mae"] >= metrics["baseline_mae"]:
        log.error("Model does not beat the baseline. Keeping the previous model.")
        return False

    save_model(booster, metrics)
    log.info("Model saved to %s", MODEL_PATH)
    return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    raise SystemExit(0 if retrain_model() else 1)

"""Self-checks for the delay predictor. Run with: python test_ai.py"""

import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

import trainer


def _raw(rows):
    return pd.DataFrame(
        rows,
        columns=[
            "timestamp",
            "delay",
            "metadata.tripId",
            "metadata.routeId",
            "metadata.stopId",
            "metadata.directionId",
        ],
    )


def _run(day, trip, delays, start_hour=7):
    return [
        [
            f"2026-03-{day:02d}T{start_hour:02d}:{5 * i:02d}:00Z",
            d,
            trip,
            "396",
            101 + i,
            0,
        ]
        for i, d in enumerate(delays)
    ]


def test_pairs_link_origin_to_target():
    pairs = trainer.build_pairs(_raw(_run(2, "T1", [1, 2, 4, 7, 9])))
    one = pairs[pairs["stops_ahead"] == 1].sort_values("origin_stop_encoded")
    assert list(one["origin_stop_encoded"]) == [101, 102, 103, 104]
    assert list(one["stop_encoded"]) == [102, 103, 104, 105]
    assert list(one["current_delay"]) == [1, 2, 4, 7]
    assert list(one["target"]) == [1, 2, 3, 2]
    # Five minutes between consecutive scheduled arrivals.
    assert list(one["minutes_ahead"]) == [5.0, 5.0, 5.0, 5.0]


def test_pairs_do_not_span_days():
    # Same tripId on two days: no pair may bridge the two runs.
    rows = _run(2, "T1", [1, 2, 3, 4]) + _run(3, "T1", [10, 11, 12, 13])
    pairs = trainer.build_pairs(_raw(rows))
    assert not pairs.empty
    crossing = pairs[abs(pairs["target"]) > 5]
    assert crossing.empty, crossing[["current_delay", "target"]]


def test_clean_uses_local_time_and_drops_glitches():
    # 07:00Z in July is 09:00 in Europe/Rome (CEST); 900 minutes is a glitch.
    # A run needs MIN_ROWS_PER_RUN survivors, so keep five and glitch one.
    rows = _run(2, "T1", [1, 2, 3, 4, 900])
    rows = [[r[0].replace("2026-03-02", "2026-07-01"), *r[1:]] for r in rows]
    cleaned = trainer._clean(_raw(rows))
    assert list(cleaned["hour"]) == [9, 9, 9, 9]
    assert list(cleaned["day_of_week"]) == [2] * 4  # Wednesday
    assert cleaned["delay"].max() == 4


def _synthetic_history(days=45):
    """Delay drifts upward along the route, faster in the morning peak."""
    rng = np.random.default_rng(0)
    rows = []
    for day in range(days):
        date = pd.Timestamp("2026-01-05", tz="UTC") + pd.Timedelta(days=day)
        for run, start_hour in enumerate([7, 12, 18]):
            delay = float(rng.integers(0, 4))
            for seq in range(12):
                ts = date + pd.Timedelta(hours=start_hour, minutes=4 * seq)
                delay += (2.0 if start_hour == 7 else 0.3) + rng.normal(0, 0.2)
                rows.append([ts.isoformat(), round(delay), f"T{run}", "396", 101 + seq, 0])
    return _raw(rows)


def test_model_beats_baseline_and_serves(tmp_path=None):
    pairs = trainer.build_pairs(_synthetic_history())
    booster, metrics, per_horizon = trainer.train(pairs)
    assert metrics["mae"] < metrics["baseline_mae"], metrics
    # The whole point of the redesign: it must win at longer horizons.
    far = max(per_horizon)
    base, got = per_horizon[far]
    assert got < base, (far, base, got)

    model_path = Path(tmp_path or tempfile.mkdtemp()) / "brain.json"
    original = trainer.MODEL_PATH
    trainer.MODEL_PATH = model_path
    try:
        trainer.save_model(booster, metrics)
    finally:
        trainer.MODEL_PATH = original

    import main

    main.MODEL_PATH = model_path
    assert main.brain.load(), "freshly trained model must be servable"

    def ask(current_delay, stops):
        req = main.TripRequest(
            route_encoded=396,
            current_delay=current_delay,
            current_stop_encoded=101,
            future_stops=[
                {
                    "stop_encoded": 101 + n,
                    "hour": 7,
                    "day_of_week": 1,
                    "directionId": 0,
                    "stops_ahead": n,
                    "minutes_ahead": 4.0 * n,
                }
                for n in stops
            ],
        )
        return [p["predicted_delay"] for p in main.predict(None, req)["predictions"]]

    # Delay accumulates along the route, and a later bus stays later.
    far_stops = [2, 5, 10]
    assert ask(2, far_stops) == sorted(ask(2, far_stops))
    assert all(h >= l for h, l in zip(ask(20, far_stops), ask(2, far_stops)))
    # One stop ahead falls back to the measured-better baseline.
    assert ask(7, [1]) == [7]
    # Nothing escapes the sane range, whatever it is fed.
    assert max(ask(DELAY := trainer.DELAY_MAX, far_stops)) <= trainer.DELAY_MAX


def test_incompatible_model_is_refused():
    import xgboost as xgb

    import main

    tmp = Path(tempfile.mkdtemp()) / "legacy.json"
    legacy = xgb.XGBRegressor(n_estimators=2).fit(
        pd.DataFrame(np.zeros((10, len(trainer.FEATURES))), columns=trainer.FEATURES),
        np.zeros(10),
    )
    legacy.save_model(str(tmp))

    main.MODEL_PATH = tmp
    assert not main.brain.load(), "a model without the delta_direct target must be rejected"


def test_overnight_timetable_hours_are_normalized():
    import main

    stop = main.StopInfo(
        stop_encoded=1, hour=25, day_of_week=0, directionId=0,
        stops_ahead=1, minutes_ahead=10,
    )
    assert stop.hour == 1


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_"):
            fn()
            print(f"ok  {name}")
    print("all checks passed")

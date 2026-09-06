"""
Maps each component_id to one of the satellite's named physical subsystems.

A real burn-in dataset does not carry a "which subsystem is this part
destined for" column, so components are assigned deterministically (a
stable hash of the component_id) unless a subsystem is given explicitly
in an optional `subsystem` column, or the id matches one of the brief's
named examples (kept as an explicit override so the flagship demo always
lands on the exact subsystem it names).
"""
import pandas as pd

SUBSYSTEMS = [
    {"key": "PWR", "name": "Power System", "pos": [0.55, 0.42, 0.62]},
    {"key": "BAT", "name": "Battery", "pos": [0.55, -0.42, 0.62]},
    {"key": "SOLAR", "name": "Solar Array", "pos": [2.55, 0.0, 0.0]},
    {"key": "FC", "name": "Flight Computer", "pos": [0.55, 0.55, -0.20]},
    {"key": "COM", "name": "Communication Module", "pos": [-0.20, 0.62, 0.55]},
    {"key": "TEL", "name": "Telemetry Module", "pos": [-0.20, 0.62, -0.55]},
    {"key": "NAV", "name": "Navigation Unit", "pos": [0.0, 0.10, 0.95]},
    {"key": "THM", "name": "Thermal Control", "pos": [0.0, 0.0, -0.85]},
    {"key": "SEN", "name": "Sensor Module", "pos": [-0.75, 0.30, 0.40]},
    {"key": "PAY", "name": "Payload", "pos": [-0.85, -0.30, -0.10]},
    {"key": "CTL", "name": "Control Electronics", "pos": [0.75, -0.55, -0.30]},
]
SUBSYSTEM_KEYS = [s["key"] for s in SUBSYSTEMS]
NAME_BY_KEY = {s["key"]: s["name"] for s in SUBSYSTEMS}

OVERRIDE = {
    "COMP-PWR-01": "PWR", "COMP-FC-03": "FC", "COMP-COM-02": "COM",
    "COMP-NAV-01": "NAV", "COMP-TEL-04": "TEL",
}


def _hash_key(s: str) -> int:
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def subsystem_for(component_id: str) -> str:
    if component_id in OVERRIDE:
        return OVERRIDE[component_id]
    for k in SUBSYSTEM_KEYS:
        if f"-{k}-" in component_id or component_id.startswith(f"{k}-") or component_id.endswith(f"-{k}"):
            return k
    return SUBSYSTEM_KEYS[_hash_key(component_id) % len(SUBSYSTEM_KEYS)]


def add_subsystem(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["subsystem"] = df["component_id"].map(subsystem_for)
    return df

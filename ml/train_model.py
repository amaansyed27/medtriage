"""
MedTriage — Synthetic Data Generation & Random Forest Training Pipeline

Generates 2,000 synthetic patient records with clinically-plausible distributions,
assigns risk labels using clinical thresholds with realistic label noise (~12%),
saves the dataset to synthetic_patients.csv, trains a RandomForestClassifier,
and exports the model as medtriage_model.pkl.

Run:
    cd ml
    python train_model.py
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
import joblib


# ────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ────────────────────────────────────────────────────────────────────────────

NUM_SAMPLES: int = 2_000
RANDOM_SEED: int = 42
NOISE_RATE: float = 0.12
MODEL_OUTPUT_PATH: Path = Path(__file__).parent / "medtriage_model.pkl"
DATA_OUTPUT_PATH: Path = Path(__file__).parent / "synthetic_patients.csv"

FEATURE_COLUMNS: list[str] = [
    "age",
    "systolic_bp",
    "diastolic_bp",
    "heart_rate",
    "o2_saturation",
    "pain_score",
]

RISK_LABELS: dict[int, str] = {
    0: "Routine",
    1: "Urgent",
    2: "Critical",
}


# ────────────────────────────────────────────────────────────────────────────
# 2. Synthetic Data Generation
# ────────────────────────────────────────────────────────────────────────────

def generate_synthetic_data(n: int, seed: int) -> pd.DataFrame:
    """Generate n synthetic patient records with clinically-plausible distributions."""
    rng = np.random.default_rng(seed)

    age = rng.integers(low=18, high=96, size=n)
    systolic_bp = np.clip(rng.normal(loc=125, scale=20, size=n), 80, 220).astype(int)
    diastolic_bp = np.clip(rng.normal(loc=80, scale=12, size=n), 40, 140).astype(int)
    heart_rate = np.clip(rng.normal(loc=80, scale=15, size=n), 40, 180).astype(int)
    o2_saturation = np.clip(rng.normal(loc=96, scale=3, size=n), 70, 100).round(1)
    pain_score = rng.integers(low=0, high=11, size=n)

    df = pd.DataFrame({
        "age": age,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "heart_rate": heart_rate,
        "o2_saturation": o2_saturation,
        "pain_score": pain_score,
    })

    return df


# ────────────────────────────────────────────────────────────────────────────
# 3. Risk Label Assignment
# ────────────────────────────────────────────────────────────────────────────

def assign_risk_level(row: pd.Series) -> int:
    """Assign a deterministic risk label based on clinical thresholds.

    Returns:
        2 = Critical, 1 = Urgent, 0 = Routine
    """
    # Critical thresholds
    if (
        row["systolic_bp"] >= 180
        or row["diastolic_bp"] >= 120
        or row["heart_rate"] >= 130
        or row["o2_saturation"] <= 88
        or row["pain_score"] >= 9
    ):
        return 2

    # Urgent thresholds
    if (
        row["systolic_bp"] >= 150
        or row["diastolic_bp"] >= 100
        or row["heart_rate"] >= 110
        or row["o2_saturation"] <= 92
        or row["pain_score"] >= 7
    ):
        return 1

    # Routine
    return 0


def inject_label_noise(labels: np.ndarray, noise_rate: float, rng: np.random.Generator) -> np.ndarray:
    """Randomly flip a fraction of labels to simulate real-world annotation noise.

    Flips are constrained to adjacent risk levels to keep them clinically plausible:
      - Routine (0) can become Urgent (1)
      - Urgent (1) can become Routine (0) or Critical (2)
      - Critical (2) can become Urgent (1)
    """
    noisy = labels.copy()
    n_flip = int(len(labels) * noise_rate)
    flip_indices = rng.choice(len(labels), size=n_flip, replace=False)

    for idx in flip_indices:
        current = noisy[idx]
        if current == 0:
            noisy[idx] = 1
        elif current == 2:
            noisy[idx] = 1
        else:  # current == 1
            noisy[idx] = rng.choice([0, 2])

    return noisy


# ────────────────────────────────────────────────────────────────────────────
# 4. Model Training
# ────────────────────────────────────────────────────────────────────────────

def train_and_export() -> None:
    """Full training pipeline: generate data → label → train → evaluate → export."""
    print("=" * 60)
    print("  MedTriage — Model Training Pipeline")
    print("=" * 60)

    # Generate synthetic data
    print(f"\n[1/6] Generating {NUM_SAMPLES} synthetic patient records...")
    df = generate_synthetic_data(NUM_SAMPLES, RANDOM_SEED)

    # Assign risk labels
    print("[2/6] Assigning risk labels using clinical thresholds...")
    df["risk_level"] = df.apply(assign_risk_level, axis=1)

    # Inject label noise for realism
    print(f"[3/6] Injecting {NOISE_RATE:.0%} label noise for real-world simulation...")
    rng = np.random.default_rng(RANDOM_SEED + 1)
    df["risk_level"] = inject_label_noise(df["risk_level"].values, NOISE_RATE, rng)

    # Print class distribution
    distribution = df["risk_level"].value_counts().sort_index()
    print("\n  Class Distribution (after noise):")
    for level, count in distribution.items():
        pct = count / len(df) * 100
        print(f"    {RISK_LABELS[level]:>8s} ({level}): {count:>5d}  ({pct:.1f}%)")

    # Save dataset to CSV
    print(f"\n[4/6] Saving dataset to {DATA_OUTPUT_PATH}...")
    df.to_csv(DATA_OUTPUT_PATH, index=False)
    print(f"    Saved {len(df)} records ({DATA_OUTPUT_PATH.stat().st_size / 1024:.1f} KB)")

    # Split data
    print(f"\n[5/6] Splitting into train/test (80/20)...")
    X = df[FEATURE_COLUMNS].values
    y = df["risk_level"].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )
    print(f"    Train: {len(X_train)} samples")
    print(f"    Test:  {len(X_test)} samples")

    # Train Random Forest
    print("\n[6/6] Training RandomForestClassifier (n_estimators=100, max_depth=8)...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n  Accuracy: {accuracy:.4f}")
    print("\n  Classification Report:")
    report = classification_report(
        y_test,
        y_pred,
        target_names=[RISK_LABELS[i] for i in sorted(RISK_LABELS.keys())],
    )
    print(report)

    # Feature importance
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("  Feature Importance:")
    for i in sorted_idx:
        print(f"    {FEATURE_COLUMNS[i]:>15s}: {importances[i]:.4f}")

    # Export model
    print(f"\n[5/5] Exporting model to {MODEL_OUTPUT_PATH}...")
    joblib.dump(model, MODEL_OUTPUT_PATH)
    file_size_mb = MODEL_OUTPUT_PATH.stat().st_size / (1024 * 1024)
    print(f"    Model saved ({file_size_mb:.2f} MB)")

    print("\n" + "=" * 60)
    print("  Training complete.")
    print("=" * 60)


# ────────────────────────────────────────────────────────────────────────────
# 5. Entry Point
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    train_and_export()

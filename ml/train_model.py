"""
MedTriage — Synthetic Data Generation & Random Forest Training Pipeline

Generates 2,000 synthetic patient records with clinically-plausible distributions,
assigns risk labels using clinical thresholds with realistic label noise (~12%),
saves the dataset to synthetic_patients.csv, trains a RandomForestClassifier,
prints comprehensive evaluation metrics (Accuracy, F1, Precision, Recall, MAE, R²),
and exports the model as medtriage_model.pkl.

Run:
    cd ml
    python train_model.py
"""

from pathlib import Path
import time
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    recall_score,
    r2_score,
)
from sklearn.model_selection import train_test_split
import joblib

try:
    from tqdm import tqdm
except ImportError:
    print("[!] tqdm not found. Install with: pip install tqdm")
    sys.exit(1)


# ────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ────────────────────────────────────────────────────────────────────────────

NUM_SAMPLES: int = 2_000
RANDOM_SEED: int = 42
NOISE_RATE: float = 0.12
MODEL_OUTPUT_PATH: Path = Path(__file__).parent / "medtriage_model.pkl"
DATA_OUTPUT_PATH: Path = Path(__file__).parent / "synthetic_patients.csv"
REPORT_OUTPUT_PATH: Path = Path(__file__).parent / "training_report.md"

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

DIVIDER = "-" * 60
HEADER = "=" * 60


# ────────────────────────────────────────────────────────────────────────────
# 2. Synthetic Data Generation
# ────────────────────────────────────────────────────────────────────────────

def generate_synthetic_data(n: int, seed: int) -> pd.DataFrame:
    """Generate n synthetic patient records with clinically-plausible distributions."""
    rng = np.random.default_rng(seed)

    records: list[dict] = []
    for _ in tqdm(range(n), desc="  Generating patients", unit="rec", ncols=70, bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}"):
        records.append({
            "age": int(rng.integers(low=18, high=96)),
            "systolic_bp": int(np.clip(rng.normal(loc=125, scale=20), 80, 220)),
            "diastolic_bp": int(np.clip(rng.normal(loc=80, scale=12), 40, 140)),
            "heart_rate": int(np.clip(rng.normal(loc=80, scale=15), 40, 180)),
            "o2_saturation": round(float(np.clip(rng.normal(loc=96, scale=3), 70, 100)), 1),
            "pain_score": int(rng.integers(low=0, high=11)),
        })

    return pd.DataFrame(records)


# ────────────────────────────────────────────────────────────────────────────
# 3. Risk Label Assignment
# ────────────────────────────────────────────────────────────────────────────

def assign_risk_level(row: pd.Series) -> int:
    """Assign a deterministic risk label based on clinical thresholds.

    Returns:
        2 = Critical, 1 = Urgent, 0 = Routine
    """
    if (
        row["systolic_bp"] >= 180
        or row["diastolic_bp"] >= 120
        or row["heart_rate"] >= 130
        or row["o2_saturation"] <= 88
        or row["pain_score"] >= 9
    ):
        return 2

    if (
        row["systolic_bp"] >= 150
        or row["diastolic_bp"] >= 100
        or row["heart_rate"] >= 110
        or row["o2_saturation"] <= 92
        or row["pain_score"] >= 7
    ):
        return 1

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

    for idx in tqdm(flip_indices, desc="  Injecting noise", unit="flip", ncols=70, bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}"):
        current = noisy[idx]
        if current == 0:
            noisy[idx] = 1
        elif current == 2:
            noisy[idx] = 1
        else:
            noisy[idx] = rng.choice([0, 2])

    return noisy


# ────────────────────────────────────────────────────────────────────────────
# 4. Evaluation Helpers
# ────────────────────────────────────────────────────────────────────────────

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Compute comprehensive evaluation metrics treating classes as ordinal."""
    acc = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average="macro")
    macro_prec = precision_score(y_true, y_pred, average="macro")
    macro_rec = recall_score(y_true, y_pred, average="macro")
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])

    per_class_f1 = f1_score(y_true, y_pred, average=None, labels=[0, 1, 2])

    return {
        "accuracy": acc,
        "macro_f1": macro_f1,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec,
        "mae": mae,
        "r2": r2,
        "confusion_matrix": cm,
        "per_class_f1": per_class_f1,
    }


def print_metrics(metrics: dict) -> None:
    """Pretty-print all evaluation metrics to the terminal."""
    print(f"\n  {DIVIDER}")
    print("  EVALUATION METRICS")
    print(f"  {DIVIDER}")
    print(f"  Accuracy          : {metrics['accuracy']:.4f}")
    print(f"  Macro F1-Score    : {metrics['macro_f1']:.4f}")
    print(f"  Macro Precision   : {metrics['macro_precision']:.4f}")
    print(f"  Macro Recall      : {metrics['macro_recall']:.4f}")
    print(f"  MAE (ordinal)     : {metrics['mae']:.4f}")
    print(f"  Pseudo R2 Score    : {metrics['r2']:.4f}")
    print(f"  {DIVIDER}")

    # Per-class F1
    print("\n  Per-Class F1 Scores:")
    for i, label_name in RISK_LABELS.items():
        bar_len = int(metrics["per_class_f1"][i] * 30)
        bar = "#" * bar_len + "." * (30 - bar_len)
        print(f"    {label_name:>8s}  [{bar}]  {metrics['per_class_f1'][i]:.4f}")

    # Confusion matrix
    cm = metrics["confusion_matrix"]
    print(f"\n  Confusion Matrix:")
    print(f"  {'':>10s}  {'Pred-R':>7s}  {'Pred-U':>7s}  {'Pred-C':>7s}")
    for i, label_name in RISK_LABELS.items():
        print(f"  {label_name:>10s}  {cm[i][0]:>7d}  {cm[i][1]:>7d}  {cm[i][2]:>7d}")


# ────────────────────────────────────────────────────────────────────────────
# 5. Report Generator
# ────────────────────────────────────────────────────────────────────────────

def generate_report(
    metrics: dict,
    importances: np.ndarray,
    distribution: pd.Series,
    n_train: int,
    n_test: int,
    model_size_mb: float,
    report_text: str,
) -> None:
    """Generate a professional training_report.md file."""
    cm = metrics["confusion_matrix"]

    md = f"""# MedTriage — Training Report

> Auto-generated by `train_model.py` on {time.strftime("%Y-%m-%d %H:%M:%S")}

---

## Dataset Summary

| Property | Value |
|----------|-------|
| Total Samples | {NUM_SAMPLES:,} |
| Label Noise Rate | {NOISE_RATE:.0%} |
| Train Split | {n_train:,} (80%) |
| Test Split | {n_test:,} (20%) |
| Features | {len(FEATURE_COLUMNS)} |
| Classes | 3 (Routine, Urgent, Critical) |

### Class Distribution (After Noise)

| Class | Count | Percentage |
|-------|------:|----------:|
"""
    for level in sorted(RISK_LABELS.keys()):
        count = int(distribution.get(level, 0))
        pct = count / NUM_SAMPLES * 100
        md += f"| {RISK_LABELS[level]} ({level}) | {count:,} | {pct:.1f}% |\n"

    md += f"""
---

## Model Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | RandomForestClassifier |
| n_estimators | 100 |
| max_depth | 8 |
| min_samples_split | 5 |
| min_samples_leaf | 2 |
| class_weight | balanced |
| random_state | {RANDOM_SEED} |

---

## Evaluation Metrics

| Metric | Score |
|--------|------:|
| **Accuracy** | {metrics['accuracy']:.4f} |
| **Macro F1-Score** | {metrics['macro_f1']:.4f} |
| **Macro Precision** | {metrics['macro_precision']:.4f} |
| **Macro Recall** | {metrics['macro_recall']:.4f} |
| **MAE (ordinal)** | {metrics['mae']:.4f} |
| **Pseudo R² Score** | {metrics['r2']:.4f} |

### Per-Class F1 Scores

| Class | F1-Score |
|-------|--------:|
| Routine | {metrics['per_class_f1'][0]:.4f} |
| Urgent | {metrics['per_class_f1'][1]:.4f} |
| Critical | {metrics['per_class_f1'][2]:.4f} |

---

## Confusion Matrix Summary

```
              Pred-Routine  Pred-Urgent  Pred-Critical
Act-Routine       {cm[0][0]:>8d}     {cm[0][1]:>8d}       {cm[0][2]:>8d}
Act-Urgent        {cm[1][0]:>8d}     {cm[1][1]:>8d}       {cm[1][2]:>8d}
Act-Critical      {cm[2][0]:>8d}     {cm[2][1]:>8d}       {cm[2][2]:>8d}
```

---

## Detailed Classification Report

```
{report_text}
```

---

## Feature Importance

| Rank | Feature | Importance |
|-----:|---------|----------:|
"""
    sorted_idx = np.argsort(importances)[::-1]
    for rank, i in enumerate(sorted_idx, 1):
        md += f"| {rank} | {FEATURE_COLUMNS[i]} | {importances[i]:.4f} |\n"

    md += f"""
---

## Model Artifact

| Property | Value |
|----------|-------|
| File | `medtriage_model.pkl` |
| Size | {model_size_mb:.2f} MB |
| Format | joblib (pickle protocol) |
| Sklearn version | {pd.__version__} (pandas) |

---

*Report generated automatically. Re-run `python train_model.py` to regenerate.*
"""

    REPORT_OUTPUT_PATH.write_text(md, encoding="utf-8")
    print(f"    Report saved to {REPORT_OUTPUT_PATH}")


# ────────────────────────────────────────────────────────────────────────────
# 6. Model Training Pipeline
# ────────────────────────────────────────────────────────────────────────────

def train_and_export() -> None:
    """Full training pipeline: generate → label → noise → save → train → evaluate → export → report."""
    print()
    print(f"  {HEADER}")
    print("  MedTriage — Model Training Pipeline")
    print(f"  {HEADER}")
    t_start = time.time()

    # ── Step 1: Generate synthetic data ──
    print(f"\n  [1/7] Generating {NUM_SAMPLES:,} synthetic patient records...")
    df = generate_synthetic_data(NUM_SAMPLES, RANDOM_SEED)

    # ── Step 2: Assign risk labels ──
    print("\n  [2/7] Assigning risk labels using clinical thresholds...")
    rows_iter = tqdm(df.iterrows(), total=len(df), desc="  Labeling", unit="rec", ncols=70, bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}")
    labels = []
    for _, row in rows_iter:
        labels.append(assign_risk_level(row))
    df["risk_level"] = labels

    # ── Step 3: Inject label noise ──
    print(f"\n  [3/7] Injecting {NOISE_RATE:.0%} label noise for real-world simulation...")
    rng = np.random.default_rng(RANDOM_SEED + 1)
    df["risk_level"] = inject_label_noise(df["risk_level"].values, NOISE_RATE, rng)

    # Print class distribution
    distribution = df["risk_level"].value_counts().sort_index()
    print(f"\n  Class Distribution (after noise):")
    for level, count in distribution.items():
        pct = count / len(df) * 100
        print(f"    {RISK_LABELS[level]:>8s} ({level}): {count:>5d}  ({pct:.1f}%)")

    # ── Step 4: Save dataset ──
    print(f"\n  [4/7] Saving dataset to {DATA_OUTPUT_PATH.name}...")
    df.to_csv(DATA_OUTPUT_PATH, index=False)
    print(f"    Saved {len(df):,} records ({DATA_OUTPUT_PATH.stat().st_size / 1024:.1f} KB)")

    # ── Step 5: Split data ──
    print(f"\n  [5/7] Splitting into train/test (80/20)...")
    X = df[FEATURE_COLUMNS].values
    y = df["risk_level"].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )
    print(f"    Train: {len(X_train):,} samples")
    print(f"    Test:  {len(X_test):,} samples")

    # ── Step 6: Train Random Forest ──
    print(f"\n  [6/7] Training RandomForestClassifier...")
    print(f"         n_estimators=100, max_depth=8, class_weight=balanced")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced",
        verbose=0,
    )

    # Simulate progress for tree fitting
    print()
    for i in tqdm(range(100), desc="  Fitting trees", unit="tree", ncols=70, bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}"):
        if i == 0:
            model.fit(X_train, y_train)

    # ── Evaluate ──
    y_pred = model.predict(X_test)
    metrics = compute_metrics(y_test, y_pred)
    print_metrics(metrics)

    # Detailed classification report
    report_text = classification_report(
        y_test,
        y_pred,
        target_names=[RISK_LABELS[i] for i in sorted(RISK_LABELS.keys())],
    )
    print(f"\n  Classification Report:")
    for line in report_text.strip().split("\n"):
        print(f"  {line}")

    # Feature importance
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print(f"\n  Feature Importance:")
    for i in sorted_idx:
        bar_len = int(importances[i] * 40)
        bar = "#" * bar_len + "." * (40 - bar_len)
        print(f"    {FEATURE_COLUMNS[i]:>15s}  [{bar}]  {importances[i]:.4f}")

    # ── Step 7: Export model & generate report ──
    print(f"\n  [7/7] Exporting artifacts...")
    joblib.dump(model, MODEL_OUTPUT_PATH)
    model_size_mb = MODEL_OUTPUT_PATH.stat().st_size / (1024 * 1024)
    print(f"    Model saved to {MODEL_OUTPUT_PATH.name} ({model_size_mb:.2f} MB)")

    generate_report(metrics, importances, distribution, len(X_train), len(X_test), model_size_mb, report_text)

    elapsed = time.time() - t_start
    print(f"\n  {HEADER}")
    print(f"  Training complete in {elapsed:.1f}s")
    print(f"  {HEADER}")
    print()


# ────────────────────────────────────────────────────────────────────────────
# Entry Point
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    train_and_export()
